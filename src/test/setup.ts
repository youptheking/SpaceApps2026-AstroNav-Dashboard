import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
afterEach(cleanup);

// jsdom has no canvas; the ECG trace simply draws nothing in tests
HTMLCanvasElement.prototype.getContext = () => null;
