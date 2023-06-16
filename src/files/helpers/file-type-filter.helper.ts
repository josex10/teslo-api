import { BadRequestException } from '@nestjs/common';

export const fileTypeFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  callback,
) => {
  if (!file) return callback(new BadRequestException('File is empty'), false);

  const fileExtension = file.mimetype.split('/')[1];
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif'];

  if (validExtensions.includes(fileExtension)) {
    callback(null, true);
  } else {
    callback(new BadRequestException('Invalid image type'), false);
  }
};
