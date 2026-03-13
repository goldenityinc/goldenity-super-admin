import httpClient from './httpClient';

export async function changeSuperAdminPassword(payload: {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> {
  await httpClient.put('/settings/change-password', payload);
}
