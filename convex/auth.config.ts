export default {
  providers: [
    {
      domain: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
      applicationID: "blindpod",
    },
  ],
};
