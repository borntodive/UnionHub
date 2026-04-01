export function xmlPrincipalResponse(
  href: string,
  principalHref: string,
): string {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<multistatus xmlns="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">',
    "  <response>",
    `    <href>${href}</href>`,
    "    <propstat>",
    "      <prop>",
    "        <resourcetype><collection/></resourcetype>",
    "        <current-user-principal>",
    `          <href>${principalHref}</href>`,
    "        </current-user-principal>",
    "      </prop>",
    "      <status>HTTP/1.1 200 OK</status>",
    "    </propstat>",
    "  </response>",
    "</multistatus>",
  ].join("\r\n");
}

// Response for the principal home (/carddav/{crewcode}/)
// iOS needs to find addressbook-home-set here to discover the addressbook
export function xmlPrincipalHomeResponse(
  href: string,
  addressbookHomeHref: string,
): string {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<multistatus xmlns="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">',
    "  <response>",
    `    <href>${href}</href>`,
    "    <propstat>",
    "      <prop>",
    "        <resourcetype><collection/></resourcetype>",
    "        <card:addressbook-home-set>",
    `          <href>${addressbookHomeHref}</href>`,
    "        </card:addressbook-home-set>",
    "      </prop>",
    "      <status>HTTP/1.1 200 OK</status>",
    "    </propstat>",
    "  </response>",
    "</multistatus>",
  ].join("\r\n");
}

export function xmlAddressbookResponse(
  addressbookHref: string,
  ctag: string,
): string {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<multistatus xmlns="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav" xmlns:cs="http://calendarserver.org/ns/">',
    "  <response>",
    `    <href>${addressbookHref}</href>`,
    "    <propstat>",
    "      <prop>",
    "        <resourcetype><collection/><card:addressbook/></resourcetype>",
    "        <displayname>UnionHub</displayname>",
    `        <cs:getctag>${ctag}</cs:getctag>`,
    "      </prop>",
    "      <status>HTTP/1.1 200 OK</status>",
    "    </propstat>",
    "  </response>",
    "</multistatus>",
  ].join("\r\n");
}

export function xmlAddressbookListing(
  addressbookHref: string,
  contacts: Array<{ href: string; etag: string }>,
  ctag: string,
): string {
  const contactRows = contacts
    .map((c) =>
      [
        "  <response>",
        `    <href>${c.href}</href>`,
        "    <propstat>",
        "      <prop>",
        `        <getetag>${c.etag}</getetag>`,
        "        <getcontenttype>text/vcard; charset=utf-8</getcontenttype>",
        "      </prop>",
        "      <status>HTTP/1.1 200 OK</status>",
        "    </propstat>",
        "  </response>",
      ].join("\r\n"),
    )
    .join("\r\n");

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<multistatus xmlns="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav" xmlns:cs="http://calendarserver.org/ns/">',
    "  <response>",
    `    <href>${addressbookHref}</href>`,
    "    <propstat>",
    "      <prop>",
    "        <resourcetype><collection/><card:addressbook/></resourcetype>",
    "        <displayname>UnionHub</displayname>",
    `        <cs:getctag>${ctag}</cs:getctag>`,
    "      </prop>",
    "      <status>HTTP/1.1 200 OK</status>",
    "    </propstat>",
    "  </response>",
    contactRows,
    "</multistatus>",
  ].join("\r\n");
}
