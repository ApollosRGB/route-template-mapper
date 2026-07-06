/* Auto-generated from the provided map + route-template files. Do not hand-edit. */
window.KNOWN_GRAPHS = [
  {
    "graphId": "KMP 400P-1-5G diffDrive",
    "agvTypes": [
      {
        "vendorName": "kuka",
        "typeName": "KMP 400P-1-5G diffDrive"
      }
    ],
    "nodeIds": [
      "1",
      "10",
      "11",
      "13",
      "15",
      "16",
      "17",
      "2",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9"
    ],
    "edgeIds": [
      "1-10",
      "1-6",
      "10-16",
      "10-9",
      "11-10",
      "11-17",
      "11-6",
      "13-15",
      "13-8",
      "15-13",
      "16-10",
      "17-11",
      "2-4",
      "4-5",
      "5-1",
      "6-1",
      "6-11",
      "7-8",
      "8-13",
      "8-2",
      "9-7"
    ],
    "bundle": {
      "templates": [
        {
          "id": "kuka_edge",
          "nodes": [
            "A",
            "B"
          ],
          "edges": [
            {
              "id": "AB",
              "startNode": "A",
              "endNode": "B"
            }
          ],
          "steps": [
            {
              "reference": "A",
              "type": "node",
              "actions": [],
              "attributes": []
            },
            {
              "reference": "AB",
              "type": "edge",
              "actions": [],
              "attributes": [
                {
                  "key": "maxSpeed",
                  "value": "MAXSPEED_AB"
                }
              ]
            },
            {
              "reference": "B",
              "type": "node",
              "actions": [],
              "attributes": []
            }
          ]
        }
      ],
      "mappings": [
        {
          "id": "kuka_edge_11_17_mapping",
          "template": "kuka_edge",
          "actionMapping": false,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "11"
            },
            {
              "key": "B",
              "value": "17"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            }
          ],
          "navigationGraphId": "KMP 400P-1-5G diffDrive"
        },
        {
          "id": "kuka_edge_17_11_mapping",
          "template": "kuka_edge",
          "actionMapping": false,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "17"
            },
            {
              "key": "B",
              "value": "11"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            }
          ],
          "navigationGraphId": "KMP 400P-1-5G diffDrive"
        },
        {
          "id": "kuka_edge_11_6_mapping",
          "template": "kuka_edge",
          "actionMapping": false,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "11"
            },
            {
              "key": "B",
              "value": "6"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            }
          ],
          "navigationGraphId": "KMP 400P-1-5G diffDrive"
        },
        {
          "id": "kuka_edge_6_11_mapping",
          "template": "kuka_edge",
          "actionMapping": false,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "6"
            },
            {
              "key": "B",
              "value": "11"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            }
          ],
          "navigationGraphId": "KMP 400P-1-5G diffDrive"
        },
        {
          "id": "kuka_edge_10_16_mapping",
          "template": "kuka_edge",
          "actionMapping": false,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "10"
            },
            {
              "key": "B",
              "value": "16"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            }
          ],
          "navigationGraphId": "KMP 400P-1-5G diffDrive"
        },
        {
          "id": "kuka_edge_16_10_mapping",
          "template": "kuka_edge",
          "actionMapping": false,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "16"
            },
            {
              "key": "B",
              "value": "10"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            }
          ],
          "navigationGraphId": "KMP 400P-1-5G diffDrive"
        },
        {
          "id": "kuka_edge_1_10_mapping",
          "template": "kuka_edge",
          "actionMapping": false,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "1"
            },
            {
              "key": "B",
              "value": "10"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            }
          ],
          "navigationGraphId": "KMP 400P-1-5G diffDrive"
        },
        {
          "id": "kuka_edge_1_6_mapping",
          "template": "kuka_edge",
          "actionMapping": false,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "1"
            },
            {
              "key": "B",
              "value": "6"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            }
          ],
          "navigationGraphId": "KMP 400P-1-5G diffDrive"
        },
        {
          "id": "kuka_edge_6_1_mapping",
          "template": "kuka_edge",
          "actionMapping": false,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "6"
            },
            {
              "key": "B",
              "value": "1"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            }
          ],
          "navigationGraphId": "KMP 400P-1-5G diffDrive"
        },
        {
          "id": "kuka_edge_8_13_mapping",
          "template": "kuka_edge",
          "actionMapping": false,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "8"
            },
            {
              "key": "B",
              "value": "13"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            }
          ],
          "navigationGraphId": "KMP 400P-1-5G diffDrive"
        },
        {
          "id": "kuka_edge_13_8_mapping",
          "template": "kuka_edge",
          "actionMapping": false,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "13"
            },
            {
              "key": "B",
              "value": "8"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            }
          ],
          "navigationGraphId": "KMP 400P-1-5G diffDrive"
        },
        {
          "id": "kuka_edge_7_8_mapping",
          "template": "kuka_edge",
          "actionMapping": false,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "7"
            },
            {
              "key": "B",
              "value": "8"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            }
          ],
          "navigationGraphId": "KMP 400P-1-5G diffDrive"
        },
        {
          "id": "kuka_edge_5_1_mapping",
          "template": "kuka_edge",
          "actionMapping": false,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "5"
            },
            {
              "key": "B",
              "value": "1"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            }
          ],
          "navigationGraphId": "KMP 400P-1-5G diffDrive"
        }
      ]
    }
  },
  {
    "graphId": "tusk",
    "agvTypes": [
      {
        "vendorName": "Tuskrobots",
        "typeName": "E10"
      }
    ],
    "nodeIds": [
      "0000",
      "0002",
      "0003",
      "0004",
      "0005",
      "0007",
      "0011",
      "0013",
      "0014",
      "0015",
      "0016"
    ],
    "edgeIds": [
      "0000_0011",
      "0002_0003",
      "0002_0007",
      "0002_0016",
      "0003_0002",
      "0004_0016",
      "0005_0015",
      "0007_0000",
      "0011_0014",
      "0013_0014",
      "0014_0005",
      "0014_0013",
      "0015_0016",
      "0016_0002",
      "0016_0004"
    ],
    "bundle": {
      "templates": [
        {
          "id": "TUSK_DROPOFF",
          "steps": [
            {
              "reference": "A",
              "type": "node",
              "actions": [
                {
                  "actionName": "$DROP",
                  "blockingType": "HARD",
                  "actionParameters": [
                    {
                      "key": "autoReturnNode",
                      "value": "DROP_AUTORETURNNODE_A",
                      "dataType": "boolean"
                    },
                    {
                      "key": "containerTheta",
                      "value": "DROP_CONTAINERTHETA_A",
                      "dataType": "number"
                    },
                    {
                      "key": "containerTypeId",
                      "value": "DROP_CONTAINERTYPEID_A",
                      "dataType": "number"
                    },
                    {
                      "key": "containerX",
                      "value": "DROP_CONTAINERX_A",
                      "dataType": "number"
                    },
                    {
                      "key": "containerY",
                      "value": "DROP_CONTAINERY_A",
                      "dataType": "number"
                    },
                    {
                      "key": "description",
                      "value": "DROP_DESCRIPTION_A",
                      "dataType": "string"
                    },
                    {
                      "key": "detectBeforeDrop",
                      "value": "detectBeforeDrop_1",
                      "dataType": "boolean"
                    },
                    {
                      "key": "onlyFork",
                      "value": "DROP_ONLYFORK_A",
                      "dataType": "boolean"
                    }
                  ],
                  "targetHandlingStationCondition": {
                    "externalId": "DROP_EXTERNAL_STATION_ID_A",
                    "loaded": null
                  }
                }
              ],
              "attributes": [
                {
                  "key": "mapTheta",
                  "value": "MAPTHETA_A"
                }
              ]
            }
          ]
        },
        {
          "id": "TUSK_PICKUP",
          "steps": [
            {
              "reference": "A",
              "type": "node",
              "actions": [
                {
                  "actionName": "$PICK",
                  "blockingType": "HARD",
                  "actionParameters": [
                    {
                      "key": "autoReturnNode",
                      "value": "PICK_AUTORETURNNODE_A",
                      "dataType": "boolean"
                    },
                    {
                      "key": "containerTheta",
                      "value": "PICK_CONTAINERTHETA_A",
                      "dataType": "number"
                    },
                    {
                      "key": "containerTypeId",
                      "value": "PICK_CONTAINERTYPEID_A",
                      "dataType": "number"
                    },
                    {
                      "key": "containerX",
                      "value": "PICK_CONTAINERX_A",
                      "dataType": "number"
                    },
                    {
                      "key": "containerY",
                      "value": "PICK_CONTAINERY_A",
                      "dataType": "number"
                    },
                    {
                      "key": "description",
                      "value": "PICK_DESCRIPTION_A",
                      "dataType": "string"
                    },
                    {
                      "key": "onlyFork",
                      "value": "PICK_ONLYFORK_A",
                      "dataType": "boolean"
                    }
                  ],
                  "targetHandlingStationCondition": {
                    "externalId": "PICK_EXTERNAL_STATION_ID_A",
                    "loaded": null
                  }
                }
              ],
              "attributes": [
                {
                  "key": "mapTheta",
                  "value": "MAPTHETA_A"
                }
              ]
            }
          ]
        },
        {
          "id": "tusk_edge",
          "steps": [
            {
              "reference": "A",
              "type": "node",
              "actions": [],
              "attributes": []
            },
            {
              "reference": "AB",
              "type": "edge",
              "actions": [],
              "attributes": [
                {
                  "key": "maxSpeed",
                  "value": "MAXSPEED_AB"
                },
                {
                  "key": "orientation",
                  "value": "ORIENTATION_AB"
                },
                {
                  "key": "orientationType",
                  "value": "ORIENTATIONTYPE_AB"
                }
              ]
            },
            {
              "reference": "B",
              "type": "node",
              "actions": [],
              "attributes": []
            }
          ]
        }
      ],
      "mappings": [
        {
          "id": "TUSK_DROPOFF_0003_mapping",
          "template": "TUSK_DROPOFF",
          "actionMapping": false,
          "conditions": {
            "milestoneTypes": [
              "DROPOFF"
            ],
            "targetActions": [],
            "agvTypes": [],
            "usages": []
          },
          "entries": [
            {
              "key": "A",
              "value": "0003"
            },
            {
              "key": "DROP_AUTORETURNNODE_A",
              "value": "true"
            },
            {
              "key": "DROP_CONTAINERTHETA_A",
              "value": "0"
            },
            {
              "key": "DROP_CONTAINERTYPEID_A",
              "value": "1"
            },
            {
              "key": "DROP_CONTAINERX_A",
              "value": "20.5"
            },
            {
              "key": "DROP_CONTAINERY_A",
              "value": "7.1"
            },
            {
              "key": "DROP_DESCRIPTION_A",
              "value": ""
            },
            {
              "key": "DROP_EXTERNAL_STATION_ID_A",
              "value": "T1"
            },
            {
              "key": "DROP_ONLYFORK_A",
              "value": "true"
            },
            {
              "key": "MAPTHETA_A",
              "value": "0"
            },
            {
              "key": "detectBeforeDrop_1",
              "value": "false"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "TUSK_DROPOFF_0013_mapping",
          "template": "TUSK_DROPOFF",
          "actionMapping": false,
          "conditions": {
            "milestoneTypes": [
              "DROPOFF"
            ],
            "targetActions": [],
            "agvTypes": [],
            "usages": []
          },
          "entries": [
            {
              "key": "A",
              "value": "0013"
            },
            {
              "key": "DROP_AUTORETURNNODE_A",
              "value": "true"
            },
            {
              "key": "DROP_CONTAINERTHETA_A",
              "value": "-1.57"
            },
            {
              "key": "DROP_CONTAINERTYPEID_A",
              "value": "1"
            },
            {
              "key": "DROP_CONTAINERX_A",
              "value": "10.2"
            },
            {
              "key": "DROP_CONTAINERY_A",
              "value": "3.0"
            },
            {
              "key": "DROP_DESCRIPTION_A",
              "value": ""
            },
            {
              "key": "DROP_EXTERNAL_STATION_ID_A",
              "value": "T2"
            },
            {
              "key": "DROP_ONLYFORK_A",
              "value": "true"
            },
            {
              "key": "MAPTHETA_A",
              "value": "-1.57"
            },
            {
              "key": "detectBeforeDrop_1",
              "value": "false"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "TUSK_PICKUP_0003_mapping",
          "template": "TUSK_PICKUP",
          "actionMapping": false,
          "conditions": {
            "milestoneTypes": [
              "PICKUP"
            ],
            "targetActions": [],
            "agvTypes": [],
            "usages": []
          },
          "entries": [
            {
              "key": "A",
              "value": "0003"
            },
            {
              "key": "MAPTHETA_A",
              "value": "0"
            },
            {
              "key": "PICK_AUTORETURNNODE_A",
              "value": "true"
            },
            {
              "key": "PICK_CONTAINERTHETA_A",
              "value": "0"
            },
            {
              "key": "PICK_CONTAINERTYPEID_A",
              "value": "1"
            },
            {
              "key": "PICK_CONTAINERX_A",
              "value": "20.5"
            },
            {
              "key": "PICK_CONTAINERY_A",
              "value": "7.1"
            },
            {
              "key": "PICK_DESCRIPTION_A",
              "value": ""
            },
            {
              "key": "PICK_EXTERNAL_STATION_ID_A",
              "value": "T1"
            },
            {
              "key": "PICK_ONLYFORK_A",
              "value": "true"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "TUSK_PICKUP_0013_mapping",
          "template": "TUSK_PICKUP",
          "actionMapping": false,
          "conditions": {
            "milestoneTypes": [
              "PICKUP"
            ],
            "targetActions": [],
            "agvTypes": [],
            "usages": []
          },
          "entries": [
            {
              "key": "A",
              "value": "0013"
            },
            {
              "key": "MAPTHETA_A",
              "value": "-1.57"
            },
            {
              "key": "PICK_AUTORETURNNODE_A",
              "value": "true"
            },
            {
              "key": "PICK_CONTAINERTHETA_A",
              "value": "-1.57"
            },
            {
              "key": "PICK_CONTAINERTYPEID_A",
              "value": "1"
            },
            {
              "key": "PICK_CONTAINERX_A",
              "value": "10.2"
            },
            {
              "key": "PICK_CONTAINERY_A",
              "value": "3.0"
            },
            {
              "key": "PICK_DESCRIPTION_A",
              "value": ""
            },
            {
              "key": "PICK_EXTERNAL_STATION_ID_A",
              "value": "T2"
            },
            {
              "key": "PICK_ONLYFORK_A",
              "value": "true"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0000_0011_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0000"
            },
            {
              "key": "B",
              "value": "0011"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "0"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0002_0003_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0002"
            },
            {
              "key": "B",
              "value": "0003"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "0"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0002_0007_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0002"
            },
            {
              "key": "B",
              "value": "0007"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "0"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0002_0016_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0002"
            },
            {
              "key": "B",
              "value": "0016"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "0"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0003_0002_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0003"
            },
            {
              "key": "B",
              "value": "0002"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "3.14"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0004_0016_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0004"
            },
            {
              "key": "B",
              "value": "0016"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "3.14"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0005_0015_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0005"
            },
            {
              "key": "B",
              "value": "0015"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "0"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0007_0000_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0007"
            },
            {
              "key": "B",
              "value": "0000"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "0"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0011_0014_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0011"
            },
            {
              "key": "B",
              "value": "0014"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "0"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0013_0014_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0013"
            },
            {
              "key": "B",
              "value": "0014"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "3.14"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0014_0005_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0014"
            },
            {
              "key": "B",
              "value": "0005"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "0"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0014_0013_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0014"
            },
            {
              "key": "B",
              "value": "0013"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "0"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0015_0016_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0015"
            },
            {
              "key": "B",
              "value": "0016"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "0"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0016_0002_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0016"
            },
            {
              "key": "B",
              "value": "0002"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "0"
            }
          ],
          "navigationGraphId": "tusk"
        },
        {
          "id": "tusk_edge_0016_0004_mapping",
          "template": "tusk_edge",
          "actionMapping": true,
          "conditions": null,
          "entries": [
            {
              "key": "A",
              "value": "0016"
            },
            {
              "key": "B",
              "value": "0004"
            },
            {
              "key": "MAXSPEED_AB",
              "value": "1"
            },
            {
              "key": "ORIENTATIONTYPE_AB",
              "value": "TANGENTIAL"
            },
            {
              "key": "ORIENTATION_AB",
              "value": "0"
            }
          ],
          "navigationGraphId": "tusk"
        }
      ]
    }
  }
];
window.TEMPLATE_PACKS = [
  {
    "key": "kuka",
    "name": "KUKA style — plain edges (maxSpeed)",
    "templates": [
      {
        "id": "kuka_edge",
        "nodes": [
          "A",
          "B"
        ],
        "edges": [
          {
            "id": "AB",
            "startNode": "A",
            "endNode": "B"
          }
        ],
        "steps": [
          {
            "reference": "A",
            "type": "node",
            "actions": [],
            "attributes": []
          },
          {
            "reference": "AB",
            "type": "edge",
            "actions": [],
            "attributes": [
              {
                "key": "maxSpeed",
                "value": "MAXSPEED_AB"
              }
            ]
          },
          {
            "reference": "B",
            "type": "node",
            "actions": [],
            "attributes": []
          }
        ]
      }
    ]
  },
  {
    "key": "tusk",
    "name": "Tusk style — pickup / dropoff / edge",
    "templates": [
      {
        "id": "TUSK_DROPOFF",
        "steps": [
          {
            "reference": "A",
            "type": "node",
            "actions": [
              {
                "actionName": "$DROP",
                "blockingType": "HARD",
                "actionParameters": [
                  {
                    "key": "autoReturnNode",
                    "value": "DROP_AUTORETURNNODE_A",
                    "dataType": "boolean"
                  },
                  {
                    "key": "containerTheta",
                    "value": "DROP_CONTAINERTHETA_A",
                    "dataType": "number"
                  },
                  {
                    "key": "containerTypeId",
                    "value": "DROP_CONTAINERTYPEID_A",
                    "dataType": "number"
                  },
                  {
                    "key": "containerX",
                    "value": "DROP_CONTAINERX_A",
                    "dataType": "number"
                  },
                  {
                    "key": "containerY",
                    "value": "DROP_CONTAINERY_A",
                    "dataType": "number"
                  },
                  {
                    "key": "description",
                    "value": "DROP_DESCRIPTION_A",
                    "dataType": "string"
                  },
                  {
                    "key": "detectBeforeDrop",
                    "value": "detectBeforeDrop_1",
                    "dataType": "boolean"
                  },
                  {
                    "key": "onlyFork",
                    "value": "DROP_ONLYFORK_A",
                    "dataType": "boolean"
                  }
                ],
                "targetHandlingStationCondition": {
                  "externalId": "DROP_EXTERNAL_STATION_ID_A",
                  "loaded": null
                }
              }
            ],
            "attributes": [
              {
                "key": "mapTheta",
                "value": "MAPTHETA_A"
              }
            ]
          }
        ]
      },
      {
        "id": "TUSK_PICKUP",
        "steps": [
          {
            "reference": "A",
            "type": "node",
            "actions": [
              {
                "actionName": "$PICK",
                "blockingType": "HARD",
                "actionParameters": [
                  {
                    "key": "autoReturnNode",
                    "value": "PICK_AUTORETURNNODE_A",
                    "dataType": "boolean"
                  },
                  {
                    "key": "containerTheta",
                    "value": "PICK_CONTAINERTHETA_A",
                    "dataType": "number"
                  },
                  {
                    "key": "containerTypeId",
                    "value": "PICK_CONTAINERTYPEID_A",
                    "dataType": "number"
                  },
                  {
                    "key": "containerX",
                    "value": "PICK_CONTAINERX_A",
                    "dataType": "number"
                  },
                  {
                    "key": "containerY",
                    "value": "PICK_CONTAINERY_A",
                    "dataType": "number"
                  },
                  {
                    "key": "description",
                    "value": "PICK_DESCRIPTION_A",
                    "dataType": "string"
                  },
                  {
                    "key": "onlyFork",
                    "value": "PICK_ONLYFORK_A",
                    "dataType": "boolean"
                  }
                ],
                "targetHandlingStationCondition": {
                  "externalId": "PICK_EXTERNAL_STATION_ID_A",
                  "loaded": null
                }
              }
            ],
            "attributes": [
              {
                "key": "mapTheta",
                "value": "MAPTHETA_A"
              }
            ]
          }
        ]
      },
      {
        "id": "tusk_edge",
        "steps": [
          {
            "reference": "A",
            "type": "node",
            "actions": [],
            "attributes": []
          },
          {
            "reference": "AB",
            "type": "edge",
            "actions": [],
            "attributes": [
              {
                "key": "maxSpeed",
                "value": "MAXSPEED_AB"
              },
              {
                "key": "orientation",
                "value": "ORIENTATION_AB"
              },
              {
                "key": "orientationType",
                "value": "ORIENTATIONTYPE_AB"
              }
            ]
          },
          {
            "reference": "B",
            "type": "node",
            "actions": [],
            "attributes": []
          }
        ]
      }
    ]
  }
];
window.EXAMPLE_MAP = {"id":"map","name":"None","description":"Made with SYNAOS MapGenerator Editor","navigationGraphs":[{"id":"KMP 400P-1-5G diffDrive","agvTypes":[{"vendorName":"kuka","typeName":"KMP 400P-1-5G diffDrive"}],"graphToMapTransformation":{"xTranslation":0,"yTranslation":0,"zTranslation":0,"zRotation":0},"nodes":[{"id":"1","graphX":18.55,"graphY":10.366,"graphZ":0},{"id":"10","graphX":18.55,"graphY":8.424,"graphZ":0},{"id":"11","graphX":16,"graphY":8.424,"graphZ":0},{"id":"13","graphX":26.058,"graphY":8.424,"graphZ":0},{"id":"15","graphX":26.058,"graphY":6.1,"graphZ":0},{"id":"16","graphX":18.552,"graphY":6.177,"graphZ":0},{"id":"17","graphX":16,"graphY":6.177,"graphZ":0},{"id":"2","graphX":23.839,"graphY":10.366,"graphZ":0},{"id":"4","graphX":21.822,"graphY":10.366,"graphZ":0},{"id":"5","graphX":20.087,"graphY":10.366,"graphZ":0},{"id":"6","graphX":16,"graphY":10.366,"graphZ":0},{"id":"7","graphX":21.822,"graphY":8.424,"graphZ":0},{"id":"8","graphX":23.864,"graphY":8.424,"graphZ":0},{"id":"9","graphX":20.087,"graphY":8.424,"graphZ":0}],"edges":[{"id":"1-10","startNodeId":"1","endNodeId":"10"},{"id":"1-6","startNodeId":"1","endNodeId":"6"},{"id":"10-16","startNodeId":"10","endNodeId":"16"},{"id":"10-9","startNodeId":"10","endNodeId":"9"},{"id":"11-10","startNodeId":"11","endNodeId":"10"},{"id":"11-17","startNodeId":"11","endNodeId":"17"},{"id":"11-6","startNodeId":"11","endNodeId":"6"},{"id":"13-15","startNodeId":"13","endNodeId":"15"},{"id":"13-8","startNodeId":"13","endNodeId":"8"},{"id":"15-13","startNodeId":"15","endNodeId":"13"},{"id":"16-10","startNodeId":"16","endNodeId":"10"},{"id":"17-11","startNodeId":"17","endNodeId":"11"},{"id":"2-4","startNodeId":"2","endNodeId":"4"},{"id":"4-5","startNodeId":"4","endNodeId":"5"},{"id":"5-1","startNodeId":"5","endNodeId":"1"},{"id":"6-1","startNodeId":"6","endNodeId":"1"},{"id":"6-11","startNodeId":"6","endNodeId":"11"},{"id":"7-8","startNodeId":"7","endNodeId":"8"},{"id":"8-13","startNodeId":"8","endNodeId":"13"},{"id":"8-2","startNodeId":"8","endNodeId":"2"},{"id":"9-7","startNodeId":"9","endNodeId":"7"}]},{"id":"tusk","agvTypes":[{"vendorName":"Tuskrobots","typeName":"E10"}],"graphToMapTransformation":{"xTranslation":-7.11536,"yTranslation":-3.19676,"zTranslation":0,"zRotation":0},"nodes":[{"id":"0000","graphX":12.5,"graphY":7.1,"graphZ":0},{"id":"0002","graphX":16.8,"graphY":7.1,"graphZ":0},{"id":"0003","graphX":19,"graphY":7.1,"graphZ":0},{"id":"0004","graphX":16.8,"graphY":3.2,"graphZ":0,"parkingSpot":{"allowLoadedAgvs":false}},{"id":"0005","graphX":12.5,"graphY":5.4,"graphZ":0},{"id":"0007","graphX":14.5,"graphY":7.1,"graphZ":0},{"id":"0011","graphX":10.2,"graphY":7.1,"graphZ":0},{"id":"0013","graphX":10.2,"graphY":4.45324,"graphZ":0},{"id":"0014","graphX":10.2,"graphY":5.4,"graphZ":0},{"id":"0015","graphX":14.5,"graphY":5.4,"graphZ":0},{"id":"0016","graphX":16.8,"graphY":5.4,"graphZ":0}],"edges":[{"id":"0000_0011","startNodeId":"0000","endNodeId":"0011"},{"id":"0002_0003","startNodeId":"0002","endNodeId":"0003"},{"id":"0002_0007","startNodeId":"0002","endNodeId":"0007"},{"id":"0002_0016","startNodeId":"0002","endNodeId":"0016"},{"id":"0003_0002","startNodeId":"0003","endNodeId":"0002"},{"id":"0004_0016","startNodeId":"0004","endNodeId":"0016"},{"id":"0005_0015","startNodeId":"0005","endNodeId":"0015"},{"id":"0007_0000","startNodeId":"0007","endNodeId":"0000"},{"id":"0011_0014","startNodeId":"0011","endNodeId":"0014"},{"id":"0013_0014","startNodeId":"0013","endNodeId":"0014"},{"id":"0014_0005","startNodeId":"0014","endNodeId":"0005"},{"id":"0014_0013","startNodeId":"0014","endNodeId":"0013"},{"id":"0015_0016","startNodeId":"0015","endNodeId":"0016"},{"id":"0016_0002","startNodeId":"0016","endNodeId":"0002"},{"id":"0016_0004","startNodeId":"0016","endNodeId":"0004"}]}],"waitingSpots":[{"id":"WS_Kuka","nodes":[{"navigationGraphId":"KMP 400P-1-5G diffDrive","nodeId":"6"},{"navigationGraphId":"KMP 400P-1-5G diffDrive","nodeId":"2"}]},{"id":"WS_tusk","nodes":[{"navigationGraphId":"tusk","nodeId":"0005"},{"navigationGraphId":"tusk","nodeId":"0016"}]}],"handlingStationGroups":[{"id":"K1-G","controlled":false,"justInSequence":false,"stationAutomaticSelectionMode":"ALWAYS","handlingStations":[{"id":"K1","mapX":16,"mapY":5.6637,"mapZ":0,"width":5,"height":5,"length":5,"actions":[],"accessNodes":[{"navigationGraphId":"KMP 400P-1-5G diffDrive","nodeId":"17"}]}],"waitingSpots":[{"id":"WS_Kuka"}]},{"id":"K2-G","controlled":false,"justInSequence":false,"stationAutomaticSelectionMode":"ALWAYS","handlingStations":[{"id":"K2","mapX":18.53766,"mapY":5.61402,"mapZ":0,"width":5,"height":5,"length":5,"actions":[],"accessNodes":[{"navigationGraphId":"KMP 400P-1-5G diffDrive","nodeId":"16"}]}],"waitingSpots":[{"id":"WS_Kuka"}]},{"id":"K3-G","controlled":false,"justInSequence":false,"stationAutomaticSelectionMode":"ALWAYS","handlingStations":[{"id":"K3","mapX":26.85626,"mapY":8.44568,"mapZ":0,"width":5,"height":5,"length":5,"actions":[],"accessNodes":[{"navigationGraphId":"KMP 400P-1-5G diffDrive","nodeId":"13"}]}],"waitingSpots":[{"id":"WS_Kuka"}]},{"id":"T1-G","controlled":false,"justInSequence":false,"stationAutomaticSelectionMode":"ALWAYS","handlingStations":[{"id":"T1","mapX":27.61536,"mapY":10.29676,"mapZ":0,"width":5,"height":5,"length":5,"actions":[],"accessNodes":[{"navigationGraphId":"tusk","nodeId":"0003"}]}],"waitingSpots":[{"id":"WS_tusk"}]},{"id":"T2-G","controlled":false,"justInSequence":false,"stationAutomaticSelectionMode":"ALWAYS","handlingStations":[{"id":"T2","mapX":17.31536,"mapY":6.14676,"mapZ":0,"width":5,"height":5,"length":5,"actions":[],"accessNodes":[{"navigationGraphId":"tusk","nodeId":"0013"}]}],"waitingSpots":[{"id":"WS_tusk"}]}],"chargingStations":[],"trafficLights":[],"areas":[{"id":"Base1","points":[{"mapX":15,"mapY":10},{"mapX":20,"mapY":10},{"mapX":20,"mapY":8},{"mapX":15,"mapY":8}]},{"id":"Base2","points":[{"mapX":21,"mapY":10},{"mapX":25,"mapY":10},{"mapX":25,"mapY":8},{"mapX":21,"mapY":8}]}],"emergencyDetectors":[{"id":"All Lanes Detector","areas":["Base1","Base2"]},{"id":"Base1 Detector","areas":["Base1"]},{"id":"Base2 Detector","areas":["Base2"]}],"limitedCapacityAreas":[]};
