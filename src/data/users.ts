export interface User {
  id: string
  username: string
  password: string
  name: string
  email: string
  role: string
  department: string
}

export const USERS: User[] = [
  {
    id: '1',
    username: 'lpaniagua@cempro.com',
    password: 'Javier123!!',
    name: 'L. Paniagua',
    email: 'lpaniagua@cempro.com',
    role: 'Administrador',
    department: 'Gestión Ambiental',
  },
]
