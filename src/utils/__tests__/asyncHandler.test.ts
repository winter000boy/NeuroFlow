import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../asyncHandler.util';
import { AppError, ErrorCode } from '../errors';

describe('asyncHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it('should handle successful async function', async () => {
    const asyncFn = jest.fn().mockResolvedValue('success');
    const wrappedFn = asyncHandler(asyncFn);

    await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle async function that throws AppError', async () => {
    const error = new AppError(ErrorCode.VALIDATION_ERROR, 'Test error', 400);
    const asyncFn = jest.fn().mockRejectedValue(error);
    const wrappedFn = asyncHandler(asyncFn);

    await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should handle async function that throws generic Error', async () => {
    const error = new Error('Generic error');
    const asyncFn = jest.fn().mockRejectedValue(error);
    const wrappedFn = asyncHandler(asyncFn);

    await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should handle async function that throws string', async () => {
    const error = 'String error';
    const asyncFn = jest.fn().mockRejectedValue(error);
    const wrappedFn = asyncHandler(asyncFn);

    await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should handle synchronous function that throws', async () => {
    const syncFn = jest.fn().mockImplementation(() => {
      throw new Error('Sync error');
    });
    const wrappedFn = asyncHandler(syncFn);

    await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

    expect(syncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should handle function that returns a promise', async () => {
    const asyncFn = jest.fn().mockImplementation(() => {
      return Promise.resolve('success');
    });
    const wrappedFn = asyncHandler(asyncFn);

    await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle arrow functions', async () => {
    const asyncFn = jest.fn(async () => {
      return 'success';
    });
    const wrappedFn = asyncHandler(asyncFn);

    await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });
});