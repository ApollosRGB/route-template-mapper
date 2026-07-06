# -*- coding: utf-8 -*-
"""
Created on Mon Oct  7 09:47:37 2019

@author: DanielKampen
"""
import json
import MapComponents
import ControlComponents
import copy
from Periphery import *
from HelperFunctions import deleteEmptyDictionaryKeys

def JsonMapWriter(exportMap, path, name, user, parkingSpotAsBoolean=False):
    layout = exportToMapModel(exportMap, user, parkingSpotAsBoolean=parkingSpotAsBoolean)
    if layout:
        with open(path+'/'+name+'.json', "w+") as file:
            json.dump(layout, file, indent=2)

def JsonMapReader(path, name):
    importedMap = None
    try:
        with open(path+'/'+name+'.json') as file:
            data = json.load(file)
            try:
                if 'navigationGraphs' in data:
                    importedMap = importMapModel(data)
                else:
                    importedMap = importOldMapModel(data)
            except (KeyError, ValueError) as error:
                print('File does not match expected map formats:', error)
    except FileNotFoundError:
        print('File could not be opened, maybe the file does not exist or is not a JSON-file.')
    return importedMap


def importOldMapModel(data):
    print('Importing (old) map...')
    importProblems = 0
    nodeIdMapping = {}
    importedMap = MapComponents.Map(mapId=data['id'], mapName=data['name'], mapDescription=data['description'], withFirstGraph=False)
    graphs = list()
    if 'vdaIds' in data['nodes'][0]:
        agvTypeList = [{'vendorName': agvType['vendorName'], 'typeName': agvType['typeName']} for agvType in data['nodes'][0]['vdaIds']]
        for agvType in agvTypeList:
            newAgvType = MapComponents.AGVType(vendor=agvType['vendorName'], name=agvType['typeName'])
            graphs.append(importedMap.createNavigationGraph(agvType['typeName']+'_graph'))
            graphs[-1].addAGVType(newAgvType)
    else:
        graphs = [importedMap.createNavigationGraph('unknown')]
    for graph in graphs:
        graphAgvType = graph.getAgvTypes()
        for node in data['nodes']:
            nodeId = node['id']
            if graphAgvType:
                for vdaId in node['vdaIds']:
                    if graphAgvType[0].getVendor() == vdaId['vendorName'] and graphAgvType[0].getName() == vdaId['typeName']:
                        nodeId = vdaId['id']
                        break
            newNode = graph.createNode(nodeX=node['x'], nodeY=node['y'], nodeId=nodeId)
            nodeIdMapping[node['id']] = newNode['id']
            if 'chargingStation' in node:
                newCharger = importedMap.createChargingStation(x=node['x']+1, y=node['y']+1, chargerId=node['chargingStation']['id'])
                newCharger.assignNode(graph=graph, node=newNode)
            nodeTypeList = list()   # collection of all nodeTypes in order to have one capsuled method 'addNodeType' to run for adding them
            if 'emergencyBay' in node:   # old structure 'emergencyBay' is included due to conversion reasons
                nodeTypeList.append('emergencySpot')
            if 'parkingSpot' in node:
                nodeTypeList.append('parkingSpot')
            for nodeType in nodeTypeList:
                graph.addNodeType(node=newNode, nodeType=nodeType, nodeTypeInfo=None, oldFormat=True)
        for node in data['nodes']:
            if 'dependentNodeIds' in node:
                currentNode = graph.getNodeById(nodeIdMapping[node['id']])
                for dependency in node['dependentNodeIds']:
                    if dependency not in nodeIdMapping:
                        importProblems += 1
                        print('The given dependency id', dependency, 'is not an actual node and was not added.')
                        continue
                    dependantNode = graph.getNodeById(nodeIdMapping[dependency])
                    if dependantNode is None:
                        importProblems += 1
                        print('Could not find dependency node:', dependency)
                        continue
                    try:
                        graph.addDependencyToNode(currentNode, dependantNode)
                    except:
                        print('Could not add dependency', dependantNode, 'to node', currentNode)
        graph._idManager.updateIdList(graph._nodes)

        for edge in data['edges']:
            edgeId = edge['id']
            if graphAgvType:
                for vdaId in edge['vdaIds']:
                    if graphAgvType[0].getVendor() == vdaId['vendorName'] and graphAgvType[0].getName() == vdaId['typeName']:
                        edgeId = vdaId['id']
                        break
            startNode = graph.getNodeById(nodeIdMapping[edge['startNodeId']])
            endNode = graph.getNodeById(nodeIdMapping[edge['endNodeId']])
            graph.createEdge(startNode=startNode, endNode=endNode, edgeId=edgeId)

        if 'handlingStationGroups' in data:
            for group in data['handlingStationGroups']:
                handlingStationGroup = importedMap.createGroup(groupId=group['id'])
                for station in group['handlingStations']:
                    handlingStation = importedMap.getStationById(stationId=station['id'])
                    accessNodes = []
                    for accessNode in station['handlingAccessNodes']:
                        accessNodes.append(graph.getNodeById(nodeIdMapping[accessNode['nodeId']]))
                    if handlingStation is None:
                        if 'x' in station:
                            handlingStation = importedMap.createStation(x=station['x'], y=station['y'], stationId=station['id'])
                        else:
                            firstAccessNode = accessNodes[0]
                            handlingStation = importedMap.createStation(x=firstAccessNode['x']+1, y=firstAccessNode['y']+1, stationId=station['id'])
                    for accessNode in accessNodes:
                        handlingStation.assignNode(graph, accessNode)
                    handlingStationGroup.addStation(handlingStation)

        if 'trafficLights' in data:
            for light in data['trafficLights']:
                importedMap.createTrafficLight(x=light['x'], y=light['y'], lightId=light['id'])

    print('Import done with', importProblems, 'problems.')
    return importedMap


def exportToOldMapModel(exportMap, user):
    nodes = list()
    edges = list()
    idList = ['{0:04}'.format(i) for i in range(9999)]
    if len(exportMap.getNavigationGraphList()) > 1:
        for graph in exportMap.getNavigationGraphList():
            nodeIdMapping = {}
            for node in graph.getNodes():
                newNode = copy.copy(node)
                newNode.pop('mapX')
                newNode.pop('mapY')
                newNode['id'] = idList.pop(0)
                nodeIdMapping[node['id']] = newNode['id']
                if graph.getAgvTypes():
                    newNode['vdaIds'] = list()
                    for agvType in graph.getAgvTypes():
                        newNode['vdaIds'].append(
                            {
                                'vendorName': agvType.getVendor(),
                                'typeName': agvType.getName(),
                                'id': node['id']
                            }
                        )
                nodes.append(newNode)
            for node in nodes:
                if 'dependentNodeIds' in node:
                    for dependency in node['dependentNodeIds']:
                        dependentNode = nodeIdMapping[dependency['id']]
            for edge in graph.getEdges():
                startNodeId = nodeIdMapping[edge['startNodeId']]
                endNodeId = nodeIdMapping[edge['endNodeId']]
                newEdge = dict(id=str(startNodeId)+'_'+str(endNodeId), startNodeId=startNodeId, endNodeId=endNodeId)
                if graph.getAgvTypes():
                    newEdge['vdaIds'] = list()
                    for agvType in graph.getAgvTypes():
                        newEdge['vdaIds'].append(
                            {
                                'vendorName': agvType.getVendor(),
                                'typeName': agvType.getName(),
                                'id': edge['id']
                            }
                        )
                edges.append(newEdge)
    else:
        graph = exportMap.getNavigationGraphList()[0]
        for node in graph.getNodes():
            newNode = copy.copy(node)
            newNode.pop('mapX')
            newNode.pop('mapY')
            if 'dependentNodeIds' not in newNode:
                newNode['dependentNodeIds'] = list()
            if graph.getAgvTypes():
                newNode['vdaIds'] = list()
                for agvType in graph.getAgvTypes():
                    newNode['vdaIds'].append(
                        {
                            'vendorName': agvType.getVendor(),
                            'typeName': agvType.getName(),
                            'id': node['id']
                        }
                    )
            nodes.append(newNode)
        for node in nodes:
            if node['dependentNodeIds']:
                dependencies = [dependency.nodeId for dependency in node['dependentNodeIds']]
                node['dependentNodeIds'] = dependencies
        for edge in graph.getEdges():
            newEdge = dict(id=edge['id'], startNodeId=edge['startNodeId'], endNodeId=edge['endNodeId'])
            if graph.getAgvTypes:
                newEdge['vdaIds'] = list()
                for agvType in graph.getAgvTypes():
                    newEdge['vdaIds'].append(
                        {
                            'vendorName': agvType.getVendor(),
                            'typeName': agvType.getName(),
                            'id': edge['id']
                        }
                    )
            edges.append(newEdge)
    for charger in exportMap._chargingStations:
        for assignedNode in charger.getAllAssignedNodes():
            graph = exportMap.getNavigationGraphById(assignedNode['graphId'])
            for node in nodes:
                if node['id'] == assignedNode['nodeId']:
                    node['chargingStation'] = {'id': charger.getId()}
                    break

    layout = {'id': str(exportMap.mapId),
              'name': str(exportMap.mapId),
              'description': 'Made with SYNAOS MapGenerator Editor',
              'uploadUser': str(user),
              'coordinateSystem': exportMap.getCoordinateSystem(),
              'nodes': nodes,
              'edges': edges,
              'handlingStationGroups': [group.toJsonOldModel() for group in exportMap.getHandlingStationGroups()],
              'trafficLights': [light.toJson() for light in exportMap.getTrafficLights()]
              }

    return layout


def importMapModel(data):
    print('Importing map...')
    importProblems = 0
    importedMap = MapComponents.Map(mapId=data['id'], mapName=data['name'], mapDescription=data['description'], withFirstGraph=False)
    dependencies = list()
    for graph in data['navigationGraphs']:
        newGraph = importedMap.createNavigationGraph(graph['id'])
        if 'graphToMapTransformation' in graph:
            transX = graph['graphToMapTransformation']['xTranslation']
            transY = graph['graphToMapTransformation']['yTranslation']
            rotZ = graph['graphToMapTransformation']['zRotation']
            newGraph.coordinateTransformation = MapComponents.CoordinateTransformation(transX=transX, transY=transY, rotation=rotZ)
        for agvType in graph['agvTypes']:
            newAgvType = MapComponents.AGVType(vendor=agvType['vendorName'], name=agvType['typeName'])
            newGraph.addAGVType(newAgvType)
        for node in graph['nodes']:
            newNode = newGraph.createNode(nodeX=node['graphX'], nodeY=node['graphY'], nodeId=node['id'], inLocalCoordinates=True)
            nodeTypeList = list()   # collection of all nodeTypes in order to have one capsuled method 'addNodeType' to run for adding them
            if ('emergencyBay' in node) or ('emergencySpot' in node):   # old structure 'emergencyBay' is included due to conversion reasons
                nodeTypeList.append('emergencySpot')
            if 'parkingSpot' in node:
                nodeTypeList.append('parkingSpot')
            for nodeType in nodeTypeList:
                newGraph.addNodeType(node=newNode, nodeType=nodeType, nodeTypeInfo=node[str(nodeType)])
        for node in graph['nodes']:
            currentNode = newGraph.getNodeById(node['id'])
            if 'dependentNodeIds' in node:
                for dependency in node['dependentNodeIds']:
                    dependencies.append({'baseGraph': newGraph, 'baseNodeId': node['id'], 'dependency': dependency})
        newGraph._edges = [edge for edge in graph['edges'] if edge['startNodeId'] != edge['endNodeId']]
        newGraph.recalculateTransformation()
        newGraph._idManager.updateIdList(newGraph._nodes)
    if 'waitingSpots' in data:
        for ws in data['waitingSpots']:
            importedMap.addWaitingSpot(waitingSpot=ws)
    for entry in dependencies:
        baseNode = entry['baseGraph'].getNodeById(entry['baseNodeId'])
        dependency = entry['dependency']
        graphOfDependantNode = importedMap.getNavigationGraphById(dependency['navigationGraphId'])
        if graphOfDependantNode is not None:
            dependantNode = graphOfDependantNode.getNodeById(dependency['id'])
            if dependantNode is not None:
                if dependantNode['id'] == baseNode['id'] and graphOfDependantNode == entry['baseGraph']:
                    importProblems += 1
                    print('Cannot add dependency', dependency['id'], 'on', baseNode['id'], ', this would be a self dependency.')
                else:
                    graphOfDependantNode.addDependencyToNode(baseNode, dependantNode)
            else:
                importProblems += 1
                print('Dependent node does not exist', dependency['id'], 'and cannot be added to node',
                      baseNode['id'])
        else:
            importProblems += 1
            print('Graph of dependent node does not exist', dependency['navigationGraphId'],
                  'and cannot be added to node', baseNode['id'])
    if not importedMap.navigationGraphs:
        importedMap.createNavigationGraph(newGraphId=None)
    if 'handlingStationGroups' in data:
        for group in data['handlingStationGroups']:
            handlingStationGroup = importedMap.createGroup(groupId=group['id'])
            if 'controlled' in group:
                handlingStationGroup._controlled = group['controlled']
            else:
                importProblems += 1
                print('Handlingstationgroup {group} does not include \'controlled\' information. Added default '
                      '(controlled = true) automatically.'.format(group=handlingStationGroup.getId()))
            if 'justInSequence' in group:
                handlingStationGroup._justInSequence = group['justInSequence']
            else:
                importProblems += 1
                print('Handlingstationgroup {group} does not include \'justInSequence\' information. Added default '
                      '(justInSequence = false) automatically.'.format(group=handlingStationGroup.getId()))
            if 'pickingStationAutomatically' in group:
                if group['pickingStationAutomatically']:
                    handlingStationGroup._stationAutomaticSelectionMode = StationAutomaticSelectionMode['ALWAYS']
                else:
                    handlingStationGroup._stationAutomaticSelectionMode = StationAutomaticSelectionMode['NEVER']
            elif 'selectStationAutomatically' in group:
                if group['selectStationAutomatically']:
                    handlingStationGroup._stationAutomaticSelectionMode = StationAutomaticSelectionMode['ALWAYS']
                else:
                    handlingStationGroup._stationAutomaticSelectionMode = StationAutomaticSelectionMode['NEVER']
            elif 'stationAutomaticSelectionMode' in group:
                handlingStationGroup._stationAutomaticSelectionMode = StationAutomaticSelectionMode[group['stationAutomaticSelectionMode']]
            else:
                importProblems += 1
                print('Handlingstationgroup {group} does not include \'stationAutomaticSelectionMode\' information. Added default '
                      '(stationAutomaticSelectionMode = ALWAYS) automatically.'.format(group=handlingStationGroup.getId()))
            for station in group['handlingStations']:
                handlingStation = importedMap.getStationById(stationId=station['id'])
                if handlingStation is None:
                    handlingStation = importedMap.createStation(x=station['mapX'], y=station['mapY'], stationId=station['id'])
                    if 'actions' in station:
                        for action in station['actions']:
                            handlingStation.addAction(typeName=action['type'], triggerEvent=action['triggerEvent'])
                    for accessNode in station['accessNodes']:
                        try:
                            graph = importedMap.getNavigationGraphById(accessNode['navigationGraphId'])
                            try:
                                handlingStation.assignNode(graph,
                                                           graph.getNodeById(accessNode['nodeId']))
                            except TypeError:
                                importProblems += 1
                                print('Could not find access node', accessNode['nodeId'], 'on graph',
                                      accessNode['navigationGraphId'],
                                      'for handling station', handlingStation.getId())
                        except TypeError:
                            importProblems += 1
                            print('Unknown graph with graph ID', accessNode['navigationGraphId'], 'for handling station',
                                  handlingStation.getId())
                handlingStationGroup.addStation(handlingStation)
            if 'waitingSpots' in group:
                for ws in group['waitingSpots']:
                    waitingSpot = importedMap.findWaitingSpot(ws['id'])
                    handlingStationGroup.addWaitingSpot(waitingSpot)
    if 'trafficLights' in data:
        for light in data['trafficLights']:
            newTrafficLight = importedMap.createTrafficLight(x=light['mapX'], y=light['mapY'], lightId=light['id'])
            if 'scenarioIndicatorCounter' in light:
                try:
                    newTrafficLight.createTriggerScenario(
                        onScenario=light['scenarioIndicatorCounter']['onScenario'],
                        offScenario=light['scenarioIndicatorCounter']['offScenario'],
                        threshold=light['scenarioIndicatorCounter']['onThreshold'],
                    )
                except (ValueError, TypeError) as error:
                    importProblems += 1
                    print('Could not add trigger scenario for {light} because of: {error}'.format(
                        light=light['id'], error=error))
                    continue
                for triggerNode in light['scenarioIndicatorCounter']['triggerNodes']:
                    try:
                        newTrafficLight.triggerScenario.addTriggerNode(
                            nodeId=triggerNode['nodeId'],
                            navigationGraphId=triggerNode['navigationGraphId'],
                            value=triggerNode['value'],
                            event=triggerNode['event']
                        )
                    except (ValueError, TypeError) as error:
                        importProblems += 1
                        print('Could not add trigger node {node} to {light} because of: {error}'.format(
                            node=triggerNode['nodeId'], light=light['id'], error=error))

    if 'chargingStations' in data:
        for chargerData in data['chargingStations']:
            chargingStation = importedMap.getChargingStationById(chargerId=chargerData['id'])
            if chargingStation is None:
                chargingStation = importedMap.createChargingStation(x=chargerData['mapX'], y=chargerData['mapY'], chargerId=chargerData['id'])
            if 'controlled' in chargerData:
                chargingStation._controlled = chargerData['controlled']
            else:
                importProblems += 1
                print('Charging station {charger} does not include \'controlled\' information. Added default '
                      '(controlled = true) automatically.'.format(charger=chargingStation.getId()))
            for accessNode in chargerData['accessNodes']:
                try:
                    graph = importedMap.getNavigationGraphById(accessNode['navigationGraphId'])
                    if graph is None:
                        importProblems += 1
                        print('Could not find graph for', accessNode['nodeId'],
                              'of charging station', chargingStation.getId())
                        continue
                    try:
                        chargingStation.assignNode(graph,
                                                   graph.getNodeById(accessNode['nodeId']))
                    except TypeError:
                        importProblems += 1
                        print('Could not find access node', accessNode['nodeId'], 'on graph',
                              accessNode['navigationGraphId'],
                              'for charging station', chargingStation.getId())
                except TypeError:
                    importProblems += 1
                    print('Unknown graph with graph ID', accessNode['navigationGraphId'], 'for charging station',
                          chargingStation.getId())

    if 'limitedCapacityAreas' in data:
        for lca in data['limitedCapacityAreas']:
            newLca = importedMap.createLimitedCapacityArea(lcaId=lca['id'], capacity=lca['capacity'])
            for node in lca['nodes']:
                newLca.addNode(node['nodeId'], node['navigationGraphId'])

    if 'areas' in data:
        for area in data['areas']:
            newArea = importedMap.createArea(areaId=area['id'])
            for point in area['points']:
                newArea.addPoint(ControlComponents.Point(point['mapX'], point['mapY']))

    if 'emergencyDetectors' in data:
        for detector in data['emergencyDetectors']:
            newDetector = importedMap.createEmergencyDetector(name=detector['id'])
            for areaName in detector['areas']:
                area = importedMap.getAreaByName(areaName)
                if area is None:
                    importProblems += 1
                    print('Could not find area', areaName, 'of emergency detector ', newDetector.name)
                else:
                    newDetector.addArea(area)

    print('Import done with', importProblems, 'problems.')
    return importedMap


def exportToMapModel(exportMap: MapComponents.Map, user, parkingSpotAsBoolean):
    layout = {'id': str(exportMap._mapId),
              'name': str(exportMap._mapName),
              'description': str(exportMap._mapDescription),
              'uploadUser': str(user),
              'coordinateSystem': exportMap.getCoordinateSystem(),
              'navigationGraphs': [navGraph.toJson(parkingSpotAsBoolean=parkingSpotAsBoolean) for navGraph in exportMap.getNavigationGraphList()],
              'waitingSpots': [waitingSpot.toJson() for waitingSpot in exportMap.getWaitingSpots()],
              'handlingStationGroups': [group.toJson() for group in exportMap.getHandlingStationGroups()],
              'chargingStations': [station.toJson() for station in exportMap.getChargingStations()],
              'trafficLights': [light.toJson() for light in exportMap.getTrafficLights()],
              'areas': [area.toJson() for area in exportMap.getAreas()],
              'emergencyDetectors': [detector.toJson() for detector in exportMap.getEmergencyDetectors()],
              'limitedCapacityAreas': [lca.toJson() for lca in exportMap.getLimitedCapacityAreas()],
              }
    layout = deleteEmptyDictionaryKeys(layout)
    return layout