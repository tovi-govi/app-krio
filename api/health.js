export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "krioh2o-api",
    env: {
      hasTwoFactorKey: Boolean(process.env.TWO_FACTOR_API_KEY),
      hasTwoFactorTemplate: Boolean(process.env.TWO_FACTOR_TEMPLATE_NAME),
    },
  });
}
