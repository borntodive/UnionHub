import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DeviceToken } from "./entities/device-token.entity";
import { UserRole } from "../common/enums/user-role.enum";
import { Ruolo } from "../common/enums/ruolo.enum";

interface ExpoPushMessage {
  to: string;
  sound?: string;
  title?: string;
  body?: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
  ) {}

  async registerToken(
    userId: string,
    token: string,
    platform: string = "expo",
  ): Promise<DeviceToken> {
    // Check if this exact token already exists
    const existingToken = await this.deviceTokenRepository.findOne({
      where: { token },
    });

    if (existingToken) {
      // Update userId if different (token transferred to new user)
      if (existingToken.userId !== userId) {
        existingToken.userId = userId;
      }
      existingToken.isActive = true;
      existingToken.lastUsedAt = new Date();
      return this.deviceTokenRepository.save(existingToken);
    }

    // Deactivate all other tokens for this user on the same platform to avoid
    // duplicate notifications when the Expo push token is refreshed or the
    // app is reinstalled (old token stays in DB alongside the new one).
    await this.deviceTokenRepository.update(
      { userId, platform, isActive: true },
      { isActive: false },
    );

    // Create new token
    const deviceToken = this.deviceTokenRepository.create({
      userId,
      token,
      platform,
      isActive: true,
      lastUsedAt: new Date(),
    });

    return this.deviceTokenRepository.save(deviceToken);
  }

  async unregisterToken(token: string, userId: string): Promise<void> {
    await this.deviceTokenRepository.update(
      { token, userId },
      { isActive: false },
    );
  }

  async notifyRsaUsers(
    ruolo: Ruolo,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const tokens = await this.deviceTokenRepository
      .createQueryBuilder("dt")
      .innerJoin("users", "u", "u.id = dt.userId")
      .where("dt.isActive = true")
      .andWhere("u.rsa = :rsa", { rsa: true })
      .andWhere("u.ruolo = :ruolo", { ruolo })
      .getMany();

    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      sound: "default",
      title,
      body,
      data,
    }));

    await this.sendExpoNotifications(messages);
  }

  async notifyAdmins(
    ruolo: Ruolo,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    // Find active tokens belonging to SuperAdmins or Admins of the given ruolo
    const tokens = await this.deviceTokenRepository
      .createQueryBuilder("dt")
      .innerJoin("users", "u", "u.id = dt.userId")
      .where("dt.isActive = true")
      .andWhere(
        "(u.role = :superadmin OR (u.role = :admin AND u.ruolo = :ruolo))",
        {
          superadmin: UserRole.SUPERADMIN,
          admin: UserRole.ADMIN,
          ruolo,
        },
      )
      .getMany();

    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      sound: "default",
      title,
      body,
      data,
    }));

    await this.sendExpoNotifications(messages);
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const tokens = await this.deviceTokenRepository.find({
      where: { userId, isActive: true },
    });

    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      sound: "default",
      title,
      body,
      data,
    }));

    await this.sendExpoNotifications(messages);
  }

  async broadcastNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const tokens = await this.deviceTokenRepository.find({
      where: { isActive: true },
    });

    if (tokens.length === 0) return;

    // Send in batches of 100 (Expo limit)
    const batchSize = 100;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const messages: ExpoPushMessage[] = batch.map((t) => ({
        to: t.token,
        sound: "default",
        title,
        body,
        data,
      }));

      await this.sendExpoNotifications(messages);
    }
  }

  /**
   * Broadcast a silent data-only notification to all active devices.
   * No alert, no sound — used to trigger client-side cache invalidation.
   */
  async broadcastSilent(
    type: string,
    extra?: Record<string, any>,
  ): Promise<void> {
    const tokens = await this.deviceTokenRepository.find({
      where: { isActive: true },
    });

    if (tokens.length === 0) return;

    const batchSize = 100;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const messages: ExpoPushMessage[] = batch.map((t) => ({
        to: t.token,
        data: { type, ...extra },
        // No title/body → silent on Expo
      }));
      await this.sendExpoNotifications(messages);
    }
  }

  private async sendExpoNotifications(
    messages: ExpoPushMessage[],
  ): Promise<void> {
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();

      // Handle errors and deactivate invalid tokens
      if (result.data && Array.isArray(result.data)) {
        for (let i = 0; i < result.data.length; i++) {
          const item = result.data[i];
          if (
            item.status === "error" &&
            item.details?.error === "DeviceNotRegistered"
          ) {
            // Deactivate invalid token
            await this.deviceTokenRepository.update(
              { token: messages[i].to },
              { isActive: false },
            );
          }
        }
      }
    } catch (error) {
      console.error("Failed to send push notification:", error);
    }
  }
}
