import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { createHash } from "crypto";
import * as express from "express";
import { User } from "../users/entities/user.entity";
import { UsersService } from "../users/users.service";
import { UserRole } from "../common/enums/user-role.enum";
import { generateVCard, getVCardEtag } from "./vcard.utils";
import {
  xmlPrincipalResponse,
  xmlPrincipalHomeResponse,
  xmlAddressbookResponse,
  xmlAddressbookListing,
} from "./xml.utils";

interface CardDavPath {
  crewcode?: string;
  inContacts: boolean;
  filename?: string; // e.g. "CPT0001.vcf"
}

@Injectable()
export class CarddavService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Public entry point ──────────────────────────────────────────────────

  async handleRequest(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ): Promise<void> {
    const user = await this.authenticate(req);
    if (!user) {
      res
        .status(401)
        .set("WWW-Authenticate", 'Basic realm="UnionConnect CardDAV"')
        .end();
      return;
    }

    if (user.role === UserRole.USER) {
      res.status(403).end();
      return;
    }

    const method = req.method.toUpperCase();

    switch (method) {
      case "OPTIONS":
        this.handleOptions(res);
        break;
      case "PROPFIND":
        await this.handlePropfind(req, res, user);
        break;
      case "GET":
      case "HEAD":
        if (req.path === "/profile" || req.path === "/profile/") {
          this.handleProfile(req, res, user);
        } else {
          await this.handleGet(req, res, user);
        }
        break;
      case "PUT":
      case "DELETE":
        res.status(403).end();
        break;
      default:
        res.status(405).end();
    }
  }

  // ─── Authentication ───────────────────────────────────────────────────────

  private async authenticate(req: express.Request): Promise<User | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return null;
    }

    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx === -1) return null;

    const crewcode = decoded.slice(0, colonIdx);
    const password = decoded.slice(colonIdx + 1);

    if (!crewcode || !password) return null;

    const user = await this.usersService.findByCrewcode(crewcode);
    if (!user || !user.isActive) return null;

    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  // ─── OPTIONS ─────────────────────────────────────────────────────────────

  private handleOptions(res: express.Response): void {
    res
      .status(200)
      .set("DAV", "1, 3, addressbook")
      .set("Allow", "OPTIONS, GET, HEAD, PROPFIND")
      .end();
  }

  // ─── PROPFIND ────────────────────────────────────────────────────────────

  private async handlePropfind(
    req: express.Request,
    res: express.Response,
    user: User,
  ): Promise<void> {
    const parsed = this.parsePath(req.path);

    // /carddav/ — root, return principal
    if (!parsed.crewcode) {
      const principalHref = `/carddav/${user.crewcode.toLowerCase()}/`;
      res
        .status(207)
        .set("Content-Type", "text/xml; charset=utf-8")
        .set("DAV", "1, 3, addressbook")
        .send(xmlPrincipalResponse("/carddav/", principalHref));
      return;
    }

    // Ensure the crewcode in the URL matches the authenticated user
    if (parsed.crewcode.toUpperCase() !== user.crewcode.toUpperCase()) {
      res.status(403).end();
      return;
    }

    const depth = req.headers["depth"] ?? "0";

    // /carddav/{crewcode}/ — principal home, return addressbook-home-set
    // iOS uses this to discover where the addressbook lives
    if (!parsed.inContacts) {
      const addressbookHomeHref = `/carddav/${parsed.crewcode}/contacts/`;
      res
        .status(207)
        .set("Content-Type", "text/xml; charset=utf-8")
        .set("DAV", "1, 3, addressbook")
        .send(
          xmlPrincipalHomeResponse(
            `/carddav/${parsed.crewcode}/`,
            addressbookHomeHref,
          ),
        );
      return;
    }

    // /carddav/{crewcode}/contacts/ — addressbook
    if (!parsed.filename) {
      const members = await this.getMembers(user);
      const ctag = this.computeCtag(members);
      const addressbookHref = `/carddav/${parsed.crewcode}/contacts/`;

      if (depth === "0") {
        // Return only the addressbook resource itself
        res
          .status(207)
          .set("Content-Type", "text/xml; charset=utf-8")
          .set("DAV", "1, 3, addressbook")
          .send(xmlAddressbookResponse(addressbookHref, ctag));
        return;
      }

      // depth === "1": list all contact resources
      const contacts = members.map((m) => ({
        href: `/carddav/${parsed.crewcode}/contacts/${m.crewcode.toLowerCase()}.vcf`,
        etag: getVCardEtag(m),
      }));

      res
        .status(207)
        .set("Content-Type", "text/xml; charset=utf-8")
        .set("DAV", "1, 3, addressbook")
        .send(xmlAddressbookListing(addressbookHref, contacts, ctag));
      return;
    }

    res.status(404).end();
  }

  // ─── GET (individual vCard) ───────────────────────────────────────────────

  private async handleGet(
    req: express.Request,
    res: express.Response,
    user: User,
  ): Promise<void> {
    const parsed = this.parsePath(req.path);

    if (!parsed.crewcode || !parsed.inContacts || !parsed.filename) {
      res.status(404).end();
      return;
    }

    if (parsed.crewcode.toUpperCase() !== user.crewcode.toUpperCase()) {
      res.status(403).end();
      return;
    }

    const memberCrewcode = parsed.filename.replace(/\.vcf$/i, "").toUpperCase();
    const members = await this.getMembers(user);
    const member = members.find(
      (m) => m.crewcode.toUpperCase() === memberCrewcode,
    );

    if (!member) {
      res.status(404).end();
      return;
    }

    const etag = getVCardEtag(member);
    const vcard = generateVCard(member);

    if (req.method.toUpperCase() === "HEAD") {
      res
        .status(200)
        .set("Content-Type", "text/vcard; charset=utf-8")
        .set("ETag", etag)
        .end();
      return;
    }

    res
      .status(200)
      .set("Content-Type", "text/vcard; charset=utf-8")
      .set("ETag", etag)
      .send(vcard);
  }

  // ─── iOS .mobileconfig profile ───────────────────────────────────────────

  private handleProfile(
    req: express.Request,
    res: express.Response,
    user: User,
  ): void {
    const host = this.configService.get<string>(
      "CARDDAV_HOST",
      "api.unionhub.app",
    );
    const plist = this.generateMobileConfig(user.crewcode, host);

    if (req.method.toUpperCase() === "HEAD") {
      res
        .status(200)
        .set("Content-Type", "application/x-apple-aspen-config; charset=utf-8")
        .end();
      return;
    }

    res
      .status(200)
      .set("Content-Type", "application/x-apple-aspen-config; charset=utf-8")
      .set(
        "Content-Disposition",
        `attachment; filename="unionconnect-carddav.mobileconfig"`,
      )
      .send(plist);
  }

  private generateMobileConfig(crewcode: string, host: string): string {
    const profileUUID = this.deterministicUUID(`profile-${crewcode}`);
    const payloadUUID = this.deterministicUUID(`carddav-${crewcode}`);
    const cc = crewcode.toLowerCase();

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>PayloadContent</key>
\t<array>
\t\t<dict>
\t\t\t<key>CardDAVAccountDescription</key>
\t\t\t<string>UnionConnect</string>
\t\t\t<key>CardDAVHostName</key>
\t\t\t<string>${host}</string>
\t\t\t<key>CardDAVPort</key>
\t\t\t<integer>443</integer>
\t\t\t<key>CardDAVPrincipalURL</key>
\t\t\t<string>/carddav/</string>
\t\t\t<key>CardDAVUseSSL</key>
\t\t\t<true/>
\t\t\t<key>CardDAVUsername</key>
\t\t\t<string>${crewcode}</string>
\t\t\t<key>PayloadDescription</key>
\t\t\t<string>Configura la rubrica contatti UnionConnect</string>
\t\t\t<key>PayloadDisplayName</key>
\t\t\t<string>UnionConnect Contatti</string>
\t\t\t<key>PayloadIdentifier</key>
\t\t\t<string>app.unionhub.carddav.${cc}</string>
\t\t\t<key>PayloadType</key>
\t\t\t<string>com.apple.carddav.account</string>
\t\t\t<key>PayloadUUID</key>
\t\t\t<string>${payloadUUID}</string>
\t\t\t<key>PayloadVersion</key>
\t\t\t<integer>1</integer>
\t\t</dict>
\t</array>
\t<key>PayloadDescription</key>
\t<string>Sincronizza i contatti dei colleghi UnionConnect</string>
\t<key>PayloadDisplayName</key>
\t<string>UnionConnect</string>
\t<key>PayloadIdentifier</key>
\t<string>app.unionhub.profile.${cc}</string>
\t<key>PayloadOrganization</key>
\t<string>UnionConnect</string>
\t<key>PayloadRemovalDisallowed</key>
\t<false/>
\t<key>PayloadType</key>
\t<string>Configuration</string>
\t<key>PayloadUUID</key>
\t<string>${profileUUID}</string>
\t<key>PayloadVersion</key>
\t<integer>1</integer>
</dict>
</plist>`;
  }

  private deterministicUUID(seed: string): string {
    const h = createHash("md5").update(`unionhub-${seed}`).digest("hex");
    const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80)
      .toString(16)
      .padStart(2, "0");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(18, 20)}-${h.slice(20, 32)}`;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private parsePath(rawPath: string): CardDavPath {
    // rawPath is relative to /carddav mount point (Express strips the prefix)
    // Examples:
    //   /                            → root
    //   /adminpilot/                 → user home
    //   /adminpilot/contacts/        → addressbook
    //   /adminpilot/contacts/cpt0001.vcf → individual
    const parts = rawPath
      .replace(/^\/|\/$/g, "")
      .split("/")
      .filter(Boolean);

    if (parts.length === 0) return { inContacts: false };
    if (parts.length === 1) return { crewcode: parts[0], inContacts: false };
    if (parts.length === 2) return { crewcode: parts[0], inContacts: true };
    if (parts.length === 3)
      return { crewcode: parts[0], inContacts: true, filename: parts[2] };
    return { inContacts: false };
  }

  private async getMembers(user: User): Promise<User[]> {
    const result = await this.usersService.findAll(
      { isActive: true, perPage: 1000 },
      user,
    );
    return result.data;
  }

  private computeCtag(members: User[]): string {
    if (members.length === 0) return "0";
    const max = Math.max(
      ...members.map((m) => new Date(m.updatedAt).getTime()),
    );
    return max.toString();
  }
}
