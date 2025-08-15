export interface UserDTO {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  name?: string;
}

export interface UpdateUserProfileDTO {
  name?: string;
  email?: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export interface UserProfileDTO {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}
