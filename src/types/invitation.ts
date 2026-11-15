export interface CoverLetterPublic {
  id: string;
  recipient_label: string;
  relationship_tag: string;
  password_hint: string;
}

export interface CoverLetterSecret {
  salutation: string;
  opening_story: string;
  heartfelt_message: string;
  invitation_body: string;
  event_date: string;
  ceremony_time: string;
  photo_time_slot: string;
  venue_detail: string;
  parking_and_map: string;
  dress_code: string;
  emergency_contact: string;
  closing_signature: string;
  rsvp_status_options: string[];
  post_ceremony_party?: string;
}

export interface PlainInvitationRecord extends CoverLetterPublic, CoverLetterSecret {
  route_hash: string;
  password: string;
  admin_password_hash?: string;
  private_pepper?: string;
  auto_unlock_qr?: boolean;
}

export interface EncryptedInvitationRecord extends CoverLetterPublic {
  route_hash: string;
  salt: string;
  iv: string;
  ciphertext: string;
  uses_server_pepper?: boolean;
  default_qr_key?: string;
}

export interface WishEntry {
  id: string;
  name: string;
  relationship: string;
  message: string;
  createdAt: string;
}
