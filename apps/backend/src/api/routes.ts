import type { FastifyInstance } from "fastify";
import { ListController } from "./controllers/ListController.js";
import { TaskController } from "./controllers/TaskController.js";
import { BacklogService } from "../application/services/BacklogService.js";
import type { IBacklogRepository } from "../application/ports/IBacklogRepository.js";

export function registerRoutes(app: FastifyInstance, backlogRepository: IBacklogRepository): void {
    const backlogService = new BacklogService(backlogRepository);
    const taskController = new TaskController(backlogService);
    const listController = new ListController(backlogService);

    app.get("/health", async () => ({ status: "ok" }));

    app.get("/tasks", async () => taskController.getAll());
    app.post("/tasks", async (request, reply) => taskController.create(request, reply));
    app.patch("/tasks/:id/status", async (request, reply) => taskController.updateStatus(request, reply));
    app.post("/tasks/:id/lists/:listId", async (request, reply) => taskController.assignToList(request, reply));
    app.delete("/tasks/:id/lists/:listId", async (request, reply) => taskController.removeFromList(request, reply));
    app.delete("/tasks/:id", async (request, reply) => taskController.remove(request, reply));

    app.get("/lists", async () => listController.getAll());
    app.post("/lists", async (request, reply) => listController.create(request, reply));
    app.patch("/lists/:id/move", async (request, reply) => listController.move(request, reply));
    app.delete("/lists/:id", async (request, reply) => listController.remove(request, reply));
}
