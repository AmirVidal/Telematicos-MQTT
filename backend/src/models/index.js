import { Building } from "./Building.js";
import { Channel } from "./Channel.js";
import { Event } from "./Event.js";
import { EmergencyResponse } from "./EmergencyResponse.js";
import { Incident } from "./Incident.js";
import { IncidentType } from "./IncidentType.js";
import { Message } from "./Message.js";
import { Presence } from "./Presence.js";
import { Role } from "./Role.js";
import { SupportMessage } from "./SupportMessage.js";
import { SupportRequest } from "./SupportRequest.js";
import { SupportResolution } from "./SupportResolution.js";
import { User } from "./User.js";
import { Emergency } from './Emergency.js'

export {
  Building,
  Channel,
  Emergency,
  Event,
  EmergencyResponse,
  Incident,
  IncidentType,
  Message,
  Presence,
  Role,
  SupportMessage,
  SupportRequest,
  SupportResolution,
  User,
};

export const models = {
  Building,
  Channel,
  Event,
  EmergencyResponse,
  Incident,
  IncidentType,
  Message,
  Presence,
  Role,
  SupportMessage,
  SupportRequest,
  SupportResolution,
  User,
};

export async function syncIndexes() {
  await Promise.all(Object.values(models).map((model) => model.syncIndexes()));
}
