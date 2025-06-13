import '@testing-library/jest-dom';
import fetchMocker from 'jest-fetch-mock';
import { TextEncoder, TextDecoder } from 'util';

fetchMocker.enableMocks();

// Polyfill for TextEncoder and TextDecoder which are not available in the JSDOM environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder; 