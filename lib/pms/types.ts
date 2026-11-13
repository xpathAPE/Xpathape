export interface PmsListing {
  externalId: string;
  name: string;
  address?: string;
  photoUrl?: string;
  timezone?: string;
}

export interface PmsReservation {
  externalId: string;
  listingExternalId: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: Date;
  checkOut: Date;
  guestCount: number;
  status: "accepted" | "cancelled" | "other";
}

export interface PmsAdapter {
  provider: "HOSPITABLE" | "HOSTAWAY";
  fetchListings(): Promise<PmsListing[]>;
  fetchReservations(): Promise<PmsReservation[]>;
  /** Send a message to the guest through the PMS (relayed to Airbnb thread). */
  sendMessage(reservationExternalId: string, body: string): Promise<{ ok: boolean; detail?: string }>;
}
