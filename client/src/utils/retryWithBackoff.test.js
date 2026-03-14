import { retryWithBackoff } from './retryWithBackoff';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await retryWithBackoff(operation, 3, 1000);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('should retry on network error and succeed', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce('success');
    
    const promise = retryWithBackoff(operation, 3, 1000);
    
    // Ждем первую попытку
    await Promise.resolve();
    
    // Пропускаем задержку (1 секунда)
    jest.advanceTimersByTime(1000);
    
    const result = await promise;
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  test('should retry with exponential backoff', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('connection error'))
      .mockResolvedValueOnce('success');
    
    const promise = retryWithBackoff(operation, 3, 1000);
    
    // Первая попытка
    await Promise.resolve();
    
    // Первая задержка: 1000ms * 2^0 = 1000ms
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    
    // Вторая задержка: 1000ms * 2^1 = 2000ms
    jest.advanceTimersByTime(2000);
    
    const result = await promise;
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  test('should throw error after max retries', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('network error'));
    
    const promise = retryWithBackoff(operation, 3, 1000);
    
    // Первая попытка
    await Promise.resolve();
    
    // Задержка 1: 1000ms
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    
    // Задержка 2: 2000ms
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    
    await expect(promise).rejects.toThrow('network error');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  test('should not retry on validation error', async () => {
    const validationError = new Error('Заметка слишком длинная');
    const operation = jest.fn().mockRejectedValue(validationError);
    
    await expect(retryWithBackoff(operation, 3, 1000)).rejects.toThrow('Заметка слишком длинная');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('should detect network errors correctly', async () => {
    const networkErrors = [
      new Error('network error'),
      new Error('timeout'),
      new Error('connection refused'),
      new Error('socket error'),
      new Error('превышено время ожидания'),
      new Error('нет соединения')
    ];
    
    for (const error of networkErrors) {
      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');
      
      const promise = retryWithBackoff(operation, 3, 1000);
      
      await Promise.resolve();
      jest.advanceTimersByTime(1000);
      
      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
      
      jest.clearAllTimers();
    }
  });

  test('should use default parameters', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('success');
    
    const promise = retryWithBackoff(operation); // Без параметров
    
    await Promise.resolve();
    jest.advanceTimersByTime(1000); // Базовая задержка по умолчанию
    
    const result = await promise;
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
