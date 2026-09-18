import { Controller, Get, Param } from '@nestjs/common';
import { MaterialsService } from './materials.service';

@Controller()
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get('materials')
  findAllMaterials() {
    return this.materialsService.findAllMaterials();
  }

  @Get('materials/:id')
  findMaterial(@Param('id') id: string) {
    return this.materialsService.findMaterial(id);
  }

  @Get('pile-types')
  findAllPileTypes() {
    return this.materialsService.findAllPileTypes();
  }

  @Get('pile-types/:id')
  findPileType(@Param('id') id: string) {
    return this.materialsService.findPileType(id);
  }
}
