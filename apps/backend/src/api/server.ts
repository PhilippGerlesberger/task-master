import { env } from "../env.js";
import { JsonBacklogRepository } from "../infrastructure/repositories/JsonBacklogRepository.js";
import { createApp } from "./app.js";

const app = createApp({
    backlogRepository: new JsonBacklogRepository()
});

try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (error) {
    app.log.error(error);
    process.exit(1);
}
