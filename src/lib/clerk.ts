export const isAdmin = (user: any) => {
  return user?.publicMetadata?.role === 'admin';
}
