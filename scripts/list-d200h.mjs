import { devicesAsync } from 'node-hid';

const devices = await devicesAsync(0x2207, 0x0019);
const customInterfaces = devices.filter((device) => device.interface === 0 && device.path);

if (customInterfaces.length === 0) {
  console.error('D200H not found (expected USB device 2207:0019)');
  process.exitCode = 1;
} else {
  for (const device of customInterfaces) {
    console.log(`D200H found: ${device.path} (2207:0019, interface ${device.interface})`);
  }
}
