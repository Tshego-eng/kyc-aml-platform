import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/prisma/schema.prisma",
  datasource: {
    url: "postgresql://postgres.smjlptzulfayjlyuowvq:@Tshegofatso16@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
  }
});