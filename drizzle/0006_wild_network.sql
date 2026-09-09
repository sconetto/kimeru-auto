CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_log_entity_created_idx" ON "admin_audit_log" USING btree ("entity_type","created_at");--> statement-breakpoint
CREATE INDEX "editorial_published_updated_idx" ON "editorial" USING btree ("published","updated_at");--> statement-breakpoint
CREATE INDEX "model_years_model_price_updated_idx" ON "model_years" USING btree ("model_id","price_updated_at");--> statement-breakpoint
CREATE INDEX "vehicle_images_model_position_idx" ON "vehicle_images" USING btree ("model_id","position");