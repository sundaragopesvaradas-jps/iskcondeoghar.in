import { getCosmosDatabase } from '@/lib/cosmos';

export function getUsersContainer() {
  return getCosmosDatabase().container('users');
}
