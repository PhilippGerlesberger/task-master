import type { ListItem } from "../../domain/backlogItem/ListItem.js";

export interface ListDto {
    id: string;
    title: string;
    isInbox: boolean;
    parentListId?: string;
    childListIds: string[];
}

export function toListDto(list: ListItem): ListDto {
    return {
        id: list.id,
        title: list.title,
        isInbox: list.isInbox,
        parentListId: list.parentListId,
        childListIds: [...list.childListIds]
    };
}
