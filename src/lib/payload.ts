'use server';

import configPromise from '@payload-config';
import { getPayloadHMR } from '@payloadcms/next/utilities';

export const getPayloadClient = async () => {
  return await getPayloadHMR({ config: configPromise });
};
