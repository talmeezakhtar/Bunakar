import { Controller, Get } from '@nestjs/common';
import { SwatchesService } from './swatches.service';

@Controller('swatches')
export class SwatchesController {
  constructor(private readonly swatchesService: SwatchesService) {}

  @Get()
  findAll() {
    return this.swatchesService.findAll();
  }
}
