export interface IError {
  status: number;
  messages: MappedError[];
}

export interface MappedError {
  param: string;
  msg: string;
  value: string;
}
