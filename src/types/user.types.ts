export interface UserDTO {
  id: number;
  email: string;
  createdAt: Date;
}

export interface CreateUserDTO {
  email: string;
  password: string;
}
