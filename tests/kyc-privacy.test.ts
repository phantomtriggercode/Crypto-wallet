import { describe, it, expect } from "vitest";
import { api, db, createVerifiedUser, createAdmin } from "./helpers";
import { BASE_URL } from "./global-setup";

describe("KYC document privacy", () => {
  it("a document belongs only to its owner and authorized KYC admins", async () => {
    const { user: owner } = await createVerifiedUser();
    const { cookie: strangerCookie } = await createVerifiedUser();
    const { cookie: kycAdminCookie } = await createAdmin(["KYC_ADMIN"]);
    const { cookie: contentAdminCookie } = await createAdmin(["CONTENT_ADMIN"]);

    const application = await db.kycApplication.create({
      data: {
        userId: owner.id,
        legalName: "Owner Person",
        dateOfBirth: new Date("1990-01-01"),
        country: "Testland",
        address: "1 Test St",
        status: "UNDER_REVIEW",
      },
    });
    const document = await db.kycDocument.create({
      data: {
        kycApplicationId: application.id,
        type: "GOVERNMENT_ID",
        storageKey: "kyc/does-not-exist-on-disk.png",
        originalName: "id.png",
        mimeType: "image/png",
      },
    });

    // Another regular user cannot fetch it.
    const strangerRes = await api(`/api/kyc/documents/${document.id}`, { cookie: strangerCookie });
    expect(strangerRes.status).toBe(403);

    // An admin without KYC authority cannot fetch it either.
    const contentAdminRes = await api(`/api/kyc/documents/${document.id}`, { cookie: contentAdminCookie });
    expect(contentAdminRes.status).toBe(403);

    // A KYC admin is authorized (404 here means "authorized but file missing on disk", which is expected
    // since this test never wrote a real file — the important assertion is that it is NOT 403).
    const kycAdminRes = await api(`/api/kyc/documents/${document.id}`, { cookie: kycAdminCookie });
    expect(kycAdminRes.status).not.toBe(403);

    // An unauthenticated request is rejected outright.
    const anonRes = await api(`/api/kyc/documents/${document.id}`);
    expect(anonRes.status).toBe(401);
  });

  it("rejects a disallowed file type on KYC upload", async () => {
    const { cookie } = await createVerifiedUser();

    const form = new FormData();
    form.set("legalName", "Test Person");
    form.set("dateOfBirth", "1990-01-01");
    form.set("country", "Testland");
    form.set("address", "1 Test St");
    form.set("governmentId", new Blob(["not-a-real-executable"], { type: "application/x-msdownload" }), "malware.exe");
    form.set("selfie", new Blob(["fake-image-bytes"], { type: "image/png" }), "selfie.png");

    const res = await fetch(`${BASE_URL}/api/kyc`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: form,
    });

    expect(res.status).toBe(422);
  });
});
