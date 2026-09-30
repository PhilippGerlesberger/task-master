import type { ListItem } from "../../domain/backlogItem/ListItem.js";

export interface ListDto {
    id: string;
    title: string;
    parentListId?: string;
    childListIds: string[];
}

export function toListDto(list: ListItem): ListDto {
    return {
        id: list.id,
        title: list.title,
        parentListId: list.parentListId,
        childListIds: [...list.childListIds]
    };
}
