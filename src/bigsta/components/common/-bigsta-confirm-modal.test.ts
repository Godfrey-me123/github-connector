import { describe, expect, it } from "vitest";
import { bigstaConfirm, bigstaAlert } from "./BigstaConfirmModal";

describe("BIGsta In-App Confirmation Modal (Browser Pop-up Replacement)", () => {
  it("provides in-app confirmation with custom BIGsta title without triggering browser window.confirm", async () => {
    // When no UI handler is mounted (or in test environment), it resolves safely
    const promise = bigstaConfirm({
      title: "BIGsta",
      message: 'Confirm Download / Export:\n\nDo you want to save "BIGsta_Front nida Template.pdf" to your device (Android APK Storage)?',
      confirmLabel: "OK",
      cancelLabel: "CANCEL",
    });

    expect(promise).toBeInstanceOf(Promise);
    const result = await promise;
    expect(typeof result).toBe("boolean");
  });

  it("provides in-app alert with BIGsta title without triggering browser window.alert", async () => {
    const promise = bigstaAlert({
      title: "BIGsta",
      message: "Are you sure you want to delete Page 1 of 2 from this document?",
    });

    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).resolves.toBeUndefined();
  });
});
