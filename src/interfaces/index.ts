export interface IError {
  status: number;
  messages: MappedError[];
}

export interface MappedError {
  param: string;
  msg: string;
  value: string;
}

export interface IUser {
  email: string;
  password: string;
  profile: {
    firstName: string;
    lastName: string;
  };
  employeeNumber: String;
  storeNumber: number;
  role: string;
  resetPasswordToken: string | undefined;
  resetPasswordExpires: Date | number | undefined;
  confirmationEmailToken: string;
  isVerified: boolean;
  tableData: {
    tableMetadata: string;
    tables: any;
  };
  comparePassword(cleanPassword: string, callback: any);
}
