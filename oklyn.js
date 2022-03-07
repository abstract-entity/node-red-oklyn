const axios = require('axios');

module.exports = function(RED) {

  /**
   * Oklyn Configuration node
   */
  function OklynConfig(config) {
    const node = this;
    RED.nodes.createNode(node, config);
    node.log('Registering type oklyn-config');
    node.name = config.name;
    node.apiKey = config.apiKey;
  }
  RED.nodes.registerType("oklyn-config", OklynConfig);

  /**
   * Oklyn dynamic class to create different nodes with same template
   * @param {*} type 
   * @param {*} method 
   * @returns 
   */
  function DynamicClass(type, method = 'get') {
    return function (config) {
      const node = this;
      RED.nodes.createNode(node, config);
      node.log(`Registering type oklyn ${type}`);
      node.oklyn = RED.nodes.getNode(config.oklyn);
  
      if (!node.oklyn) {
        node.status({fill: "red", shape: "ring", text: 'No api key'});
      } else {
        node.status({fill: "green", shape: "dot", text: 'Ready'});
      }
  
      node.on('input', async function(msg) {
        if (node.oklyn) {
          const deviceId = msg.deviceId || config.deviceId;
          let url = 'https://api.oklyn.fr/public/v1/devices';
          if ('data' === type) {
            url = `https://api.oklyn.fr/public/v1/device/${deviceId}/data/${config.measure}`;
          } else if (['aux', 'pump'].indexOf(type) >= 0) {
            url = `https://api.oklyn.fr/public/v1/device/${deviceId}/${type}`;
          }

          axios({
            method,
            url,
            headers: {
              'X-Api-Token': node.oklyn.apiKey,
              'User-Agent': 'node-red',
            },
            data: method === 'put' ? msg.payload : undefined
          })
            .then(response => {
              msg.payload = response.data;
              node.send(msg);
            })
            .catch(error => {
              msg.payload = error?.response?.data || error;
              node.status({fill: "red", shape: "ring", text: error?.response?.data?.formatted_error || error});
              node.error(error);
              node.send(msg);
            });
        }
      });
    }
  }

  /**
   * Oklyn list devices
   */
  RED.nodes.registerType("oklyn-devices", DynamicClass('devices'));

  /**
   * Oklyn read measures
   */
  RED.nodes.registerType("oklyn-measures", DynamicClass('data'));

  /**
   * Oklyn read pump status
   */
  RED.nodes.registerType("oklyn-read-pump", DynamicClass('pump'));

  /**
   * Oklyn write pump status
   */
  RED.nodes.registerType("oklyn-write-pump", DynamicClass('pump', 'put'));
  
  /**
   * Oklyn read auxiliary contact status
   */
  RED.nodes.registerType("oklyn-read-auxiliary", DynamicClass('aux'));
  
  /**
   * Oklyn write auxiliary contact status
   */
  RED.nodes.registerType("oklyn-write-auxiliary", DynamicClass('aux', 'put'));
}