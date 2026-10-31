-- CreateIndex
CREATE INDEX "lists_parent_list_id_idx" ON "lists"("parent_list_id");

-- CreateIndex
CREATE INDEX "task_lists_list_id_idx" ON "task_lists"("list_id");
