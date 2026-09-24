/* Real outbound mail via FormSubmit. First message to a new inbox needs one confirmation click. */
window.VaruMail = {
  adminAddress() {
    const fromDesk = window.Varu && Varu.state && Varu.state.settings && Varu.state.settings.adminEmail;
    return (fromDesk || VARU_CONFIG.adminEmail || "").trim();
  },

  async send(to, subject, fields) {
    if (!to || !to.includes("@")) {
      return { ok: false, error: "No email on file" };
    }
    try {
      const res = await fetch(VARU_CONFIG.formEndpoint + encodeURIComponent(to), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          _subject: subject,
          _template: "table",
          _captcha: "false",
          _honey: "",
          ...fields
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.message || "Mail service declined the send" };
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message || "Network error" };
    }
  },

  async sendCode(to, kind, code, extra) {
    const title = kind === "phone"
      ? "Your Varu phone verification code"
      : "Your Varu email verification code";
    const result = await this.send(to, title, {
      name: extra && extra.name ? extra.name : "Varu household",
      email: to,
      channel: kind,
      phone: extra && extra.phone ? extra.phone : "",
      island: extra && extra.island ? extra.island : "",
      message:
        "Your Varu verification code is " + code + ". It expires in 10 minutes. If you did not start an account, ignore this."
    });
    return result;
  },

  async notifyAdmin(subject, fields) {
    const admin = this.adminAddress();
    const result = await this.send(admin, subject, fields);
    if (window.Varu && Varu.state) {
      Varu.state.inbox = Varu.state.inbox || [];
      Varu.state.inbox.unshift({
        id: "MSG-" + Date.now(),
        at: new Date().toISOString(),
        subject,
        fields,
        mailed: result.ok
      });
      Varu.save();
    }
    return result;
  }
};
