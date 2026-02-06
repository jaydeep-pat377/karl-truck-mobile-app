export const logo = require('./logo.png');
export const logoSmall = require('./logo_small.png');
export const truck = require('./truck_black.png');
export const truck1 = require('./truck_brown.png');
export const truck2 = require('./truck_light_green.png');
export const truck3 = require('./truck_dark_blue.png');
export const truck4 = require('./truck_pink.png');
export const truck5 = require('./truck_light_blue.png');
export const truck6 = require('./truck_red.png');
export const truck7 = require('./truck_gray.png');
export const truck8 = require('./truck_dark_green.png');

export const truckImages = [
  truck,
  truck1,
  truck2,
  truck3,
  truck4,
  truck5,
  truck6,
  truck7,
  truck8,
];

export const truckImagesByStatus: Record<string, any> = {
  ticketed: truck7,
  loading: truck2,
  loaded: truck8,
  to_job: truck8,
  at_job: truck5,
  pouring: truck3,
  begin_pour: truck3,
  begin_pouring: truck3,
  washing: truck6,
  to_plant: truck4,
  at_plant: truck4,
  cancelled: truck6,
  cancel: truck6,
};

export default {
  logo,
  logoSmall,
  truck,
  truck1,
  truck2,
  truck3,
  truck4,
  truck5,
  truck6,
  truck7,
  truck8,
  truckImages,
  truckImagesByStatus,
};
