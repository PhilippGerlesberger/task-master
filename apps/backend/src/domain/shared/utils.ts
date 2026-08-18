import { ulid } from "ulid";
import { ItemId } from "./types.js";

export function generateItemId(): ItemId {
    // Generate a unique identifier for a backlog item.
    // This implementation uses a simple random string generator.
    
    return ulid() as ItemId;
}
    