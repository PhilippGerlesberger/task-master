import { describe, expect, it } from "vitest";
import { ListItem } from "../../../src/domain/backlogItem/ListItem.js";
import { toListDto } from "../../../src/application/dto/ListDto.js";

describe("toListDto", () => {
    it("maps inbox list with isInbox=true", () => {
        const inbox = ListItem.createInbox();

        expect(toListDto(inbox)).toMatchObject({
            id: inbox.id,
            title: inbox.title,
            isInbox: true,
            childListIds: []
        });
    });

    it("maps regular list with isInbox=false", () => {
        const list = ListItem.create({ title: "Work" });

        expect(toListDto(list)).toMatchObject({
            id: list.id,
            title: list.title,
            isInbox: false
        });
    });
});
