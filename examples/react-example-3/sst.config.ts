/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "SQL2PostgREST",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          region: process.env.AWS_REGION,
          profile: process.env.AWS_PROFILE,
        },
      },
    };
  },
  async run() {
    new sst.aws.StaticSite("SQL2PostgREST", {
      build: {
        command: "bun run build",
        output: "dist"
      },
      domain: {
        name: $app.stage === "production" ? "sql2postg.rest" : `${$app.stage}.sql2postg.rest`,
        redirects: $app.stage === "production" ? ["www.sql2postg.rest"] : [`www.${$app.stage}.sql2postg.rest`],
      },
    });
  },
});
