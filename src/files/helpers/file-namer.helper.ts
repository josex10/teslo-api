import { v4 as uuid } from 'uuid';

export const fileNamer = (
  req: Express.Request,
  file: Express.Multer.File,
  callback,
) => {
  const fileExtension = file.mimetype.split('/')[1];
  const filename = `${uuid()}.${fileExtension}`;

  callback(null, filename);
};
