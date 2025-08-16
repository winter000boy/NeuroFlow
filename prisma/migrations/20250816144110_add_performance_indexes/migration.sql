-- CreateIndex
CREATE INDEX "executions_userId_idx" ON "public"."executions"("userId");

-- CreateIndex
CREATE INDEX "executions_workflowId_idx" ON "public"."executions"("workflowId");

-- CreateIndex
CREATE INDEX "executions_status_idx" ON "public"."executions"("status");

-- CreateIndex
CREATE INDEX "executions_startedAt_idx" ON "public"."executions"("startedAt");

-- CreateIndex
CREATE INDEX "executions_finishedAt_idx" ON "public"."executions"("finishedAt");

-- CreateIndex
CREATE INDEX "executions_n8nExecutionId_idx" ON "public"."executions"("n8nExecutionId");

-- CreateIndex
CREATE INDEX "executions_userId_status_idx" ON "public"."executions"("userId", "status");

-- CreateIndex
CREATE INDEX "executions_workflowId_status_idx" ON "public"."executions"("workflowId", "status");

-- CreateIndex
CREATE INDEX "executions_userId_startedAt_idx" ON "public"."executions"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "executions_workflowId_startedAt_idx" ON "public"."executions"("workflowId", "startedAt");

-- CreateIndex
CREATE INDEX "executions_status_startedAt_idx" ON "public"."executions"("status", "startedAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "public"."refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "public"."refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "public"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "public"."users"("createdAt");

-- CreateIndex
CREATE INDEX "workflows_userId_idx" ON "public"."workflows"("userId");

-- CreateIndex
CREATE INDEX "workflows_status_idx" ON "public"."workflows"("status");

-- CreateIndex
CREATE INDEX "workflows_createdAt_idx" ON "public"."workflows"("createdAt");

-- CreateIndex
CREATE INDEX "workflows_updatedAt_idx" ON "public"."workflows"("updatedAt");

-- CreateIndex
CREATE INDEX "workflows_userId_status_idx" ON "public"."workflows"("userId", "status");

-- CreateIndex
CREATE INDEX "workflows_userId_createdAt_idx" ON "public"."workflows"("userId", "createdAt");
