import { PartialType } from "@nestjs/swagger";
import { AddItemDto } from "./add-item.dto";

export class UpdateItemDto extends PartialType(AddItemDto) {}
