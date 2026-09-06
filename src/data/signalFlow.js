export const SIGNAL_MODES = Object.freeze([
  { id: 'all', label: 'ALL CHANNELS' },
  { id: 'power', label: 'POWER' },
  { id: 'data', label: 'DATA' },
  { id: 'control', label: 'CONTROL' },
  { id: 'rf', label: 'RF' },
  { id: 'thermal', label: 'THERMAL' },
]);

export const SIGNAL_NODES = Object.freeze([
  { id:'battery', label:'BATTERY PACK', short:'BATTERY', domain:'POWER', x:150, y:155, role:'PRIMARY ENERGY SOURCE', interfaces:['3S POWER DOMAIN','CONDITION MONITORING'], scene:'10' },
  { id:'mosfet', label:'MOSFET ARRAY', short:'MOSFETS', domain:'POWER', x:350, y:108, role:'CONTROLLED BATTERY SELF-HEATING', interfaces:['POWER SWITCHING','HEATER CONTROL'], scene:'11' },
  { id:'energy-harvesting', label:'ENERGY HARVESTING', short:'HARVEST', domain:'POWER', x:150, y:310, role:'THERMAL ENERGY RECOVERY', interfaces:['LOW-VOLTAGE HARVEST','POWER INJECTION'], scene:'14' },
  { id:'converter', label:'BI-DIRECTIONAL DC-DC', short:'DC-DC', domain:'POWER', x:365, y:245, role:'POWER DOMAIN CONVERSION', interfaces:['POWER CONVERSION','BIDIRECTIONAL BUS'], scene:'13' },
  { id:'battery-sensor', label:'BATTERY VOLTAGE SENSOR', short:'VBAT SENSE', domain:'SENSOR', x:365, y:392, role:'BATTERY CONDITION MONITORING', interfaces:['ANALOG SENSE','TELEMETRY'], scene:'06' },
  { id:'regulator', label:'VOLTAGE REGULATOR', short:'REGULATOR', domain:'POWER', x:575, y:245, role:'ELECTRONICS POWER REGULATION', interfaces:['REGULATED RAIL','POWER DISTRIBUTION'], scene:'04' },

  { id:'esp32', label:'ESP32', short:'ESP32', domain:'CONTROL', x:800, y:415, role:'CENTRAL PROCESSING + SYSTEM COORDINATION', interfaces:['GPIO','ADC','SPI','UART','I²C'], scene:'01', primary:true },

  { id:'microsd', label:'MICROSD', short:'MICROSD', domain:'DATA', x:1055, y:335, role:'LOCAL TELEMETRY + DIAGNOSTIC STORAGE', interfaces:['SPI DATA','LOCAL LOGGING'], scene:'02' },
  { id:'display', label:'ILI9341 DISPLAY', short:'DISPLAY', domain:'DATA', x:1055, y:475, role:'LOCAL STATUS + TELEMETRY OUTPUT', interfaces:['SPI DISPLAY','CONTROL'], scene:'03' },
  { id:'lora', label:'LORA RADIO', short:'LORA', domain:'COMMUNICATION', x:1290, y:315, role:'LONG-RANGE LOW-POWER RADIO LINK', interfaces:['SERIAL DATA','RF FRONT END'], scene:'22' },
  { id:'antenna', label:'ANTENNA', short:'ANTENNA', domain:'COMMUNICATION', x:1490, y:315, role:'WIRELESS TRANSMISSION / RECEPTION', interfaces:['RF FEED','FREE-SPACE LINK'], scene:'23' },

  { id:'thermistor', label:'THERMISTOR', short:'THERMISTOR', domain:'SENSOR', x:405, y:670, role:'LOCAL TEMPERATURE SENSING', interfaces:['ANALOG SENSE'], scene:'05' },
  { id:'temp-sensor', label:'TEMPERATURE SENSOR', short:'TEMP', domain:'SENSOR', x:610, y:735, role:'BATTERY THERMAL MONITORING', interfaces:['TEMPERATURE DATA'], scene:'12' },
  { id:'env-sensor', label:'ENVIRONMENTAL SENSOR', short:'ENV', domain:'SENSOR', x:800, y:755, role:'HUMIDITY / TEMPERATURE / PRESSURE', interfaces:['SENSOR BUS'], scene:'09' },
  { id:'vibration-sensor', label:'VIBRATION SENSOR', short:'VIBRATION', domain:'SENSOR', x:990, y:735, role:'VIBRATION + STRUCTURAL EVENT MONITORING', interfaces:['ACCELERATION DATA','EVENT DETECTION'], scene:'08' },
  { id:'rf-sensor', label:'RF SENSOR', short:'RF SENSE', domain:'SENSOR', x:1195, y:670, role:'AMBIENT RF ACTIVITY MONITORING', interfaces:['RF DETECTION','TELEMETRY'], scene:'07' },

  { id:'heat-pipe', label:'HEAT PIPE', short:'HEAT PIPE', domain:'THERMAL', x:790, y:585, role:'PASSIVE THERMAL TRANSFER', interfaces:['THERMAL BUS'], scene:'15' },
  { id:'radiator', label:'RADIATOR', short:'RADIATOR', domain:'THERMAL', x:1010, y:585, role:'HEAT REJECTION TO ENVIRONMENT', interfaces:['THERMAL DISSIPATION'], scene:'16' },
]);

export const SIGNAL_EDGES = Object.freeze([
  { id:'p-bat-conv', from:'battery', to:'converter', kind:'power', label:'PRIMARY DC BUS', detail:'ENERGY DELIVERY' },
  { id:'p-harvest-conv', from:'energy-harvesting', to:'converter', kind:'power', label:'RECOVERED ENERGY', detail:'SUPPLEMENTAL INPUT' },
  { id:'p-conv-reg', from:'converter', to:'regulator', kind:'power', label:'CONDITIONED POWER', detail:'CONVERSION STAGE' },
  { id:'p-reg-esp', from:'regulator', to:'esp32', kind:'power', label:'REGULATED RAIL', detail:'LOGIC POWER' },
  { id:'p-reg-sd', from:'regulator', to:'microsd', kind:'power', label:'REGULATED RAIL', detail:'STORAGE POWER' },
  { id:'p-reg-display', from:'regulator', to:'display', kind:'power', label:'REGULATED RAIL', detail:'DISPLAY POWER' },
  { id:'p-reg-lora', from:'regulator', to:'lora', kind:'power', label:'REGULATED RAIL', detail:'RADIO POWER' },

  { id:'d-batsense-esp', from:'battery-sensor', to:'esp32', kind:'data', label:'ADC TELEMETRY', detail:'BATTERY CONDITION' },
  { id:'d-therm-esp', from:'thermistor', to:'esp32', kind:'data', label:'ANALOG TELEMETRY', detail:'TEMPERATURE' },
  { id:'d-temp-esp', from:'temp-sensor', to:'esp32', kind:'data', label:'SENSOR DATA', detail:'BATTERY THERMAL' },
  { id:'d-env-esp', from:'env-sensor', to:'esp32', kind:'data', label:'SENSOR BUS', detail:'ENVIRONMENT' },
  { id:'d-vib-esp', from:'vibration-sensor', to:'esp32', kind:'data', label:'SENSOR DATA', detail:'VIBRATION EVENTS' },
  { id:'d-rfsense-esp', from:'rf-sensor', to:'esp32', kind:'data', label:'RF TELEMETRY', detail:'ACTIVITY MONITOR' },
  { id:'d-esp-sd', from:'esp32', to:'microsd', kind:'data', label:'SPI DATA', detail:'LOCAL LOGGING' },
  { id:'d-esp-display', from:'esp32', to:'display', kind:'data', label:'SPI DATA', detail:'VISUAL TELEMETRY' },
  { id:'d-esp-lora', from:'esp32', to:'lora', kind:'data', label:'SERIAL DATA', detail:'REMOTE TELEMETRY' },

  { id:'c-esp-mos', from:'esp32', to:'mosfet', kind:'control', label:'SWITCH COMMAND', detail:'BATTERY SELF-HEAT' },
  { id:'c-esp-display', from:'esp32', to:'display', kind:'control', label:'DISPLAY CONTROL', detail:'LOCAL UI' },
  { id:'c-esp-lora', from:'esp32', to:'lora', kind:'control', label:'RADIO CONTROL', detail:'LINK MANAGEMENT' },

  { id:'r-lora-ant', from:'lora', to:'antenna', kind:'rf', label:'RF FEED', detail:'LORA AIR INTERFACE' },
  { id:'r-ant-rfsense', from:'antenna', to:'rf-sensor', kind:'rf', label:'RF ENVIRONMENT', detail:'MONITORED SPECTRUM' },

  { id:'t-bat-heat', from:'battery', to:'heat-pipe', kind:'thermal', label:'WASTE HEAT', detail:'PASSIVE TRANSFER' },
  { id:'t-esp-heat', from:'esp32', to:'heat-pipe', kind:'thermal', label:'DEVICE HEAT', detail:'THERMAL COLLECTION' },
  { id:'t-conv-heat', from:'converter', to:'heat-pipe', kind:'thermal', label:'CONVERSION HEAT', detail:'THERMAL COLLECTION' },
  { id:'t-heat-rad', from:'heat-pipe', to:'radiator', kind:'thermal', label:'THERMAL BUS', detail:'HEAT REJECTION' },
]);

export const SIGNAL_COLORS = Object.freeze({
  power:'#d9ec72',
  data:'#61d5ff',
  control:'#b997ff',
  rf:'#ffb36a',
  thermal:'#ff7d5f',
});

export const nodeById = Object.freeze(Object.fromEntries(SIGNAL_NODES.map(node => [node.id, node])));
