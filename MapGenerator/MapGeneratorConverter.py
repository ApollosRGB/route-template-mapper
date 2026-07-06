import os
import json
import csv
import xml
from enum import Enum
import Periphery
import MapComponents
import VectorOperations
import MagazinoTranslate
import numpy as np
from geomdl import utilities
from geomdl import NURBS
import math


def getFileName(name):
    fileName = os.path.basename(name)
    filePath = os.path.dirname(name)
    if filePath is None:
        filePath = os.getcwd()
    fileName = os.path.splitext(fileName)[0]
    return fileName, filePath


class Vendor(Enum):
    Goetting = 1
    MLR = 2
    Siemens = 3
    NavitecPure = 4
    NavitecVDA = 5
    Balyo = 6
    SiemensNew = 7
    ASTI = 8
    MLRCollection = 9
    BalyoJson = 10
    Magazino = 11
    AstiJson = 12


def importExternalMap(file, vendor):
    fileName, filePath = getFileName(file)
    importedMap = MapComponents.Map(withFirstGraph=False)

    if fileName and filePath:
        try:
            if vendor == Vendor.Goetting:
                importGoettingMap(fileName, filePath, importedMap)
            elif vendor == Vendor.Siemens:
                importSiemensMap(fileName, filePath, importedMap)
            elif vendor == Vendor.SiemensNew:
                importSiemensNewExportMap(fileName, filePath, importedMap)
            elif vendor == Vendor.MLR:
                importMLRMap(fileName, filePath, importedMap)
            elif vendor == Vendor.NavitecPure:
                importNavitecPureMap(fileName, filePath, importedMap)
            elif vendor == Vendor.NavitecVDA:
                importNavitecVDAMap(fileName, filePath, importedMap)
            elif vendor == Vendor.Balyo:
                importBalyo(fileName, filePath, importedMap)
            elif vendor == Vendor.ASTI:
                importASTI(fileName, filePath, importedMap)
            elif vendor == Vendor.MLRCollection:
                importMLRMapCollection(fileName, filePath, importedMap)
            elif vendor == Vendor.BalyoJson:
                importBalyoJson(fileName, filePath, importedMap)
            elif vendor == Vendor.Magazino:
                importMagazino(fileName, filePath, importedMap)
            elif vendor == Vendor.AstiJson:
                importAstiJson(fileName, filePath, importedMap)
            else:
                return None
            return importedMap
        except ValueError:
            print('Map file does not fit to Vendor file schema!')
            return None


def importGoettingMap(fileName, filePath, newMap: MapComponents.Map):
    with open(filePath + '/' + fileName + '.json') as file:
        data = json.load(file)
        numberOfDoubleSegments = 0
        newGraph = newMap.createNavigationGraph(newGraphId='imported_goetting_map')
        for entry in data:
            #print('Segment Id:' + str(entry['id']))
            #print('Number of Control Points' + str(len(entry['controlPoints'])))
            edgeId = str(entry['id'])
            startNodeX = entry['controlPoints'][0]['x'] / 1000
            startNodeY = entry['controlPoints'][0]['y'] / 1000
            startNode = newGraph.getNodeByCoordinates(startNodeX, startNodeY)
            if startNode is None:
                startNode = newGraph.createNode(nodeX=startNodeX, nodeY=startNodeY)
            endNodeX = entry['controlPoints'][-1]['x'] / 1000
            endNodeY = entry['controlPoints'][-1]['y'] / 1000
            endNode = newGraph.getNodeByCoordinates(endNodeX, endNodeY)
            if endNode is None:
                endNode = newGraph.createNode(nodeX=endNodeX, nodeY=endNodeY, nodeId=edgeId)
            else:
                newGraph.updateNodeId(endNode, edgeId)
            if 'label' in entry and entry['label']:
                print('Segment has label', entry['label'])
                newHSG = newMap.createGroup(groupId=entry['label'])
                newHS = newMap.createStation(x=endNode['x'], y=endNode['y'], stationId=entry['label'])
                newHS.assignNode(newGraph, endNode)
                newHSG.addStation(newHS)
            if newGraph.testEdgeExists(startNode=startNode, endNode=endNode):
                print('Edge from', startNode['id'], 'to', endNode['id'], 'does already exist and was not added.')
                numberOfDoubleSegments += 1
            else:
                newGraph.createEdge(startNode, endNode, edgeId)
        print('Number of removed double edges:', numberOfDoubleSegments)


def importSiemensMap(fileName, filePath, newMap):
    with open(filePath + '/' + fileName + '.csv') as file:
        data = csv.DictReader(file, skipinitialspace=True)
        newGraph = newMap.createNavigationGraph(newGraphId='fileName')
        for row in data:
            #ToDO: Only import selected map part or different maps as different graphs
            if not newGraph.nodeIdInNodes(row['StartName']):
                startNode = newGraph.createNode(float(row['StartX [m]']), float(row['StartY [m]']),
                                                row['StartName'].strip())
                print('Created StartNode')
            else:
                startNode = newGraph.getNodeById(row['StartName'])
            if not newGraph.nodeIdInNodes(row['EndName']):
                endNode = newGraph.createNode(float(row['EndX [m]']), float(row['EndY [m]']),
                                              row['EndName'].strip())
                print('Created EndNode')
            else:
                endNode = newGraph.getNodeById(row['EndName'])
            newGraph.createEdge(startNode, endNode)
            if int(row['BiDirectional']) == 1:
                newGraph.createEdge(endNode, startNode)


def importSiemensNewExportMap(fileName, filePath, newMap):
    with open(filePath + '/' + fileName + '.csv') as file:
        data = csv.DictReader(file, skipinitialspace=True)
        newGraph = newMap.createNavigationGraph(newGraphId='fileName')
        for row in data:
            if row['Type'] != 'Segment':
                continue
            #ToDO: Only import selected map part or different maps as different graphs
            if not newGraph.nodeIdInNodes(row['StartID']):
                startNode = newGraph.createNode(float(row['StartX [m]']), float(row['StartY [m]']),
                                                row['StartID'].strip())
                print('Created StartNode')
            else:
                startNode = newGraph.getNodeById(row['StartID'])
            if not newGraph.nodeIdInNodes(row['EndID']):
                endNode = newGraph.createNode(float(row['EndX [m]']), float(row['EndY [m]']),
                                              row['EndID'].strip())
                print('Created EndNode')
            else:
                endNode = newGraph.getNodeById(row['EndID'])
            newGraph.createEdge(startNode, endNode)
            if int(row['BiDirectional']) == 1:
                newGraph.createEdge(endNode, startNode)


def importMLRMap(fileName, filePath, newMap):
    with open(filePath + '/' + fileName + '.json') as file:
        data = json.load(file)
        newGraph = newMap.createNavigationGraph(newGraphId=data['mapId'])
        for node in data['nodes']:
            newGraph.createNode(node['nodePosition']['x'], node['nodePosition']['y'], node['nodeId'])
        for station in data['stations']:
            handlingStationCreated = False
            for stationProperty in station['stationProperties']:
                if str(stationProperty) in ('can_drop_off', 'can_pick_up'):
                    if not handlingStationCreated:
                        stationNode = newGraph.getNodeById(station['nodeId'])
                        newGroup = newMap.createGroup(groupId='BDO_of_' + station['stationName'])
                        newStation = newMap.createStation(stationNode['x']+1, stationNode['y']+1, stationId=station['stationName'])
                        newStation.assignNode(graph=newGraph, node=stationNode)
                        newMap.addStationToGroupById(newGroup, station['stationName'])
                        handlingStationCreated = True
                elif stationProperty == 'can_charge':
                    stationNode = newGraph.getNodeById(station['nodeId'])
                    newChargingStation = newMap.createChargingStation(stationNode['x']+1, stationNode['y']+1, chargerId=station['stationName'])
                    newChargingStation.assignNode(graph=newGraph, node=stationNode)
                else:
                    print('Unknown property for station!')
        for edge in data['edges']:
            newGraph.createEdge(newGraph.getNodeById(edge['startNodeId']),
                                newGraph.getNodeById(edge['endNodeId']), edge['edgeId'])


def importMLRMapCollection(fileName, filePath, newMap):
    with open(filePath + '/' + fileName + '.json') as file:
        data = json.load(file)
        newGraph = newMap.createNavigationGraph(newGraphId='mlr_map_collection')
        for mlrMap in data['maps']:
            for node in mlrMap['nodes']:
                if newGraph.getNodeById(node['nodeId']) is None:
                    newGraph.createNode(node['nodePosition']['x'], node['nodePosition']['y'], node['nodeId'])
            for station in mlrMap['stations']:
                handlingStationCreated = False
                for stationProperty in station['stationProperties']:
                    if str(stationProperty) in ('can_drop_off', 'can_pick_up'):
                        if not handlingStationCreated:
                            stationNode = newGraph.getNodeById(station['nodeId'])
                            newGroup = newMap.createGroup(groupId='BDO_of_' + station['stationName'])
                            newStation = newMap.createStation(stationNode['x']+1, stationNode['y']+1, stationId=station['stationName'])
                            newStation.assignNode(graph=newGraph, node=stationNode)
                            newMap.addStationToGroupById(newGroup, station['stationName'])
                            handlingStationCreated = True
                    elif stationProperty == 'can_charge':
                        stationNode = newGraph.getNodeById(station['nodeId'])
                        newChargingStation = newMap.createChargingStation(stationNode['x']+1, stationNode['y']+1, chargerId=station['stationName'])
                        newChargingStation.assignNode(graph=newGraph, node=stationNode)
                    else:
                        print('Unknown property for station!')
            for edge in mlrMap['edges']:
                newGraph.createEdge(newGraph.getNodeById(edge['startNodeId']),
                                    newGraph.getNodeById(edge['endNodeId']), edge['edgeId'])


def importNavitecPureMap(fileName, filePath, newMap):
    with open(filePath + '/' + fileName + '.xml') as file:
        data_tree = xml.etree.ElementTree.parse(file)
        data = data_tree.getroot()
        newGraph = newMap.createNavigationGraph(newGraphId='fileName')
        for segment_data in data.iter('segment_data'):
            for segment in segment_data.findall('segment'):
                segmentId = segment.find('id').text
                pts = segment.find('pts')
                segmentPoints = pts.findall('sp')
                startSegmentPoint = segmentPoints[-1]
                startNodeX = float(startSegmentPoint.find('x').text)
                startNodeY = float(startSegmentPoint.find('y').text)
                endSegmentPoint = segmentPoints[0]
                endNodeX = float(endSegmentPoint.find('x').text)
                endNodeY = float(endSegmentPoint.find('y').text)
                startNode = newGraph.getNodeByCoordinates(startNodeX, startNodeY)
                if startNode is None:
                    startNode = newGraph.createNode(startNodeX, startNodeY)
                endNode = newGraph.getNodeByCoordinates(endNodeX, endNodeY)
                if endNode is None:
                    endNode = newGraph.createNode(endNodeX, endNodeY)
                if not newGraph.testEdgeExists(startNode, endNode):
                    newGraph.createEdge(startNode, endNode, str(segmentId))


def importNavitecVDAMap(fileName, filePath, newMap):
    with open(filePath + '/' + fileName + '.json') as file:
        data = json.load(file)
        newGraph = newMap.createNavigationGraph(newGraphId=data['MapID'])
        for node in data['Nodes']:
            newGraph.createNode(node['X'], node['Y'], node['ID'])
            print('Node', node['ID'], 'created.')
        for edge in data['Edges']:
            newGraph.createEdge(newGraph.getNodeById(edge['StartNodeId']),
                                newGraph.getNodeById(edge['EndNodeId']), edge['ID'])
            print('Edge', edge['ID'], 'created.')


def importBalyo(fileName, filePath, newMap):
    with open(filePath + '/' + fileName + '.xml', encoding="utf-8") as file:
        parser = xml.etree.ElementTree.XMLParser(encoding="utf-8")
        data_tree = xml.etree.ElementTree.parse(file, parser=parser)
        data = data_tree.getroot()
        newGraph = newMap.createNavigationGraph(newGraphId='fileName')
        unitCountPerMeter = float(data.find('Export').find('UnitCountPerMeter').text)
        for layer in data.find('Export').find('AllLayer').findall('Layer'):
            if layer:
                #newGraph = newMap.createNavigationGraph(newGraphId=layer.get('Id'))
                #try:
                #    for destination in layer.find('AllDestinationPoints').findall('DestinationPoint'):
                #        nodeId = destination.get('Title')
                #        coordinates = destination.find('Point').text.split(';', 1)
                #        nodeX = float(coordinates[0])/unitCountPerMeter
                #        nodeY = float(coordinates[1])/unitCountPerMeter
                #        newGraph.createNode(nodeX=nodeX, nodeY=nodeY, nodeId=nodeId)
                #except Exception:
                #    print('No DestinationPoint in layer.')
                for portion in layer.find('AllPortions').findall('Portion'):
                    edgeId = portion.get('Id')
                    pointStrings = portion.find('Points').text.split(' ')
                    startNodeX = float(pointStrings[0].split(';')[0])/unitCountPerMeter
                    startNodeY = float(pointStrings[0].split(';')[1])/unitCountPerMeter
                    startNode = newGraph.getNodeByCoordinates(startNodeX, startNodeY, 0.01)
                    if startNode is None:
                        startNode = newGraph.createNode(nodeX=startNodeX, nodeY=startNodeY)
                        print(f'<DestinationPoint Id=\"{startNode["id"]}\" PortionDataId=\"{edgeId}\">')
                        print(f'\t<Point>{pointStrings[0].split(";")[0]};{pointStrings[0].split(";")[1]}</Point>')
                    endNodeX = float(pointStrings[-1].split(';')[0])/unitCountPerMeter
                    endNodeY = float(pointStrings[-1].split(';')[1])/unitCountPerMeter
                    endNode = newGraph.getNodeByCoordinates(endNodeX, endNodeY, 0.01)
                    if endNode is None:
                        endNode = newGraph.createNode(nodeX=endNodeX, nodeY=endNodeY)
                        print(f'<DestinationPoint Id=\"{endNode["id"]}\" PortionDataId=\"{edgeId}\">')
                        print(f'\t<Point>{pointStrings[-1].split(";")[0]};{pointStrings[-1].split(";")[1]}</Point>')
                    if startNode['id'] != endNode['id']:
                        newGraph.createEdge(startNode=startNode, endNode=endNode, edgeId=edgeId)
                        #newGraph.createEdge(startNode=endNode, endNode=startNode, edgeId=edgeId+'r')


def importASTI(fileName, filePath, newMap):
    print(fileName, filePath)
    poseIdentifier = "pose="
    idIdentifier = "id="
    numberOfPoseValues = 3
    with open(filePath + '/' + fileName + '.map2', encoding="utf-8") as file:
        newGraph = newMap.createNavigationGraph(newGraphId='fileName')
        links = {}
        for line in file:
            data = line.split(maxsplit=-1)
            if data[0] == 'Segment': #environment element like walls
                continue

                edgeId = data[1].strip('id=')
                startNodeX = float(data[2].strip('p1='))
                startNodeY = float(data[3])
                endNodeX = float(data[4].strip('p2='))
                endNodeY = float(data[5])
                startNode = newGraph.getNodeByCoordinates(startNodeX, startNodeY, 0.01)
                if startNode is None:
                    startNode = newGraph.createNode(nodeX=startNodeX, nodeY=startNodeY)
                endNode = newGraph.getNodeByCoordinates(endNodeX, endNodeY, 0.01)
                if endNode is None:
                    endNode = newGraph.createNode(nodeX=endNodeX, nodeY=endNodeY)
                if startNode['id'] != endNode['id']:
                    newGraph.createEdge(startNode=startNode, endNode=endNode, edgeId=edgeId)
            elif data[0] == 'Point': #dot environment element
                print(data)
            elif data[0] == 'Node':
                print(data)
                #get node id
                for entry in data:
                    if idIdentifier in entry:
                        nodeId = entry.strip(idIdentifier)
                        break
                #get pose
                for entry in data:
                    if poseIdentifier in entry:
                        x = float(entry.strip(poseIdentifier))
                        y = float(data[data.index(entry)+1])
                print(x, y)
                #linkString = next(entry for entry in data if 'links' in entry)
                if 'links' in line:
                    linkString = line.split('links=')[1].strip('~\n')
                    links[nodeId] = linkString.split()
                existingNode = newGraph.getNodeByCoordinates(x, y, 0.01)
                if existingNode is None:
                    newGraph.createNode(nodeId=nodeId, nodeX=x, nodeY=y)
        for link in links.items():
            key = link[0]
            values = link[1]
            startNode = newGraph.getNodeById(key)
            if startNode is None:
                print(f'Start node is unknown: {key}')
                continue
            for value in values:
                endNode = newGraph.getNodeById(value)
                if endNode is None:
                    print(f'End node is unknown {value}')
                    continue
                newGraph.createEdge(startNode, endNode)
            print(key, values)


def importAstiJson(fileName, filePath, newMap):
    with open(filePath + '/' + fileName + '.json') as file:
        data = json.load(file)
        newGraph = newMap.createNavigationGraph(newGraphId='new_ABB_graph')
        scale = 1/1000
        for nodeData in data['nodes']:
            newNode = newGraph.createNode(nodeX=nodeData['x']*scale, nodeY=nodeData['y']*scale, nodeId=nodeData['nodeId'])
        for edge in data['edges']:
            startNode = newGraph.getNodeById(edge['startNode']['nodeId'])
            endNode = newGraph.getNodeById(edge['endNode']['nodeId'])
            if startNode is None:
                print(f'Could not create edge because node {edge["startNode"]["nodeId"]} does not exist')
                continue
            if endNode is None:
                print(f'Could not create edge because {edge["endNode"]["nodeId"]} does not exist')
                continue
            newGraph.createEdge(startNode=startNode, endNode=endNode, edgeId=edge['id'])


def importBalyoJson(fileName, filePath, newMap):
    with open(filePath + '/' + fileName + '.json') as file:
        data = json.load(file)
        newGraph = newMap.createNavigationGraph(newGraphId=data['properties']['projectName'])
        edgeRelatingToCurve = []
        for feature in data['features']:
            geometryType = feature['geometry']['type']
            if geometryType == 'LineString':
                coordinates = feature['geometry']['coordinates']
                startNodeX = float(coordinates[0][0])
                startNodeY = float(coordinates[0][1])
                endNodeX = float(coordinates[-1][0])
                endNodeY = float(coordinates[-1][1])
                startNode = newGraph.getNodeByCoordinates(startNodeX, startNodeY, 0.01)
                endNode = newGraph.getNodeByCoordinates(endNodeX, endNodeY, 0.01)
                if startNode is None:
                    startNode = newGraph.createNode(nodeX=startNodeX, nodeY=startNodeY)
                if endNode is None:
                    endNode = newGraph.createNode(nodeX=endNodeX, nodeY=endNodeY)
                if startNode['id'] != endNode['id']:
                    newEdge = newGraph.createEdge(startNode=startNode, endNode=endNode, edgeId=feature['id'])
                    if len(feature['geometry']['coordinates']) > 2:
                        edgeRelatingToCurve.append(newEdge)

        allEdgesChecked = False
        while not allEdgesChecked:
            allEdgesChecked = True
            for edge1 in newGraph.getEdges():
                if edge1 not in edgeRelatingToCurve:
                    continue
                for edge2 in newGraph.getEdges():
                    if edge1 == edge2:
                        continue

                    edge1StartNode, edge1EndNode = newGraph.getEdgeNodes(edge1)
                    edge2StartNode, edge2EndNode = newGraph.getEdgeNodes(edge2)

                    if edge1StartNode['id'] == edge2StartNode['id'] or edge1StartNode['id'] == edge2EndNode['id'] or edge1EndNode['id'] == edge2StartNode['id'] or edge1EndNode['id'] == edge2EndNode['id']:
                        continue

                    if VectorOperations.pnt2line((edge1StartNode['mapX'], edge1StartNode['mapY']),
                                                 (edge2StartNode['mapX'], edge2StartNode['mapY']),
                                                 (edge2EndNode['mapX'], edge2EndNode['mapY'])) < 0.01:
                        newGraph.createEdge(startNode=edge1StartNode, endNode=edge2EndNode)
                        newGraph.createEdge(startNode=edge2StartNode, endNode=edge1StartNode)
                        newGraph.deleteEdge(edge2)
                        allEdgesChecked = False
                        break

                    if VectorOperations.pnt2line((edge1EndNode['mapX'], edge1EndNode['mapY']),
                                                 (edge2StartNode['mapX'], edge2StartNode['mapY']),
                                                 (edge2EndNode['mapX'], edge2EndNode['mapY'])) < 0.01:
                        newGraph.createEdge(startNode=edge1EndNode, endNode=edge2EndNode)
                        newGraph.createEdge(startNode=edge2StartNode, endNode=edge1EndNode)
                        newGraph.deleteEdge(edge2)
                        allEdgesChecked = False
                        break
        for curveEdge in edgeRelatingToCurve:
            for edge1 in newGraph.getEdges():
                for edge2 in newGraph.getEdges():
                    if edge1 in edgeRelatingToCurve or edge2 in edgeRelatingToCurve or edge1 == edge2:
                        continue
                    edge1StartNode, edge1EndNode = newGraph.getEdgeNodes(edge1)
                    edge2StartNode, edge2EndNode = newGraph.getEdgeNodes(edge2)
                    curveStartNode, curveEndNode = newGraph.getEdgeNodes(curveEdge)
                    if edge1StartNode == curveStartNode and edge2EndNode == curveEndNode and edge1EndNode == edge2StartNode:
                        newGraph.deleteEdge(edge1)
                        newGraph.deleteEdge(edge2)
        nodesToRemove = []
        for node in newGraph.getNodes():
            numberOfConnectingEdges = 0
            for edge in newGraph.getEdges():
                edgeStartNode, edgeEndNode = newGraph.getEdgeNodes(edge)
                if node == edgeStartNode or node == edgeEndNode:
                    numberOfConnectingEdges += 1
            if numberOfConnectingEdges < 2:
                nodesToRemove.append(node)
        for node in nodesToRemove:
            newGraph.deleteNode(node)

def importMagazino(fileName, filePath, newMap):
    with open(filePath + '/' + fileName + '.json') as file:
        data = json.load(file)
        newGraph = newMap.createNavigationGraph(newGraphId='new_Magazino_graph')
        topological_graph = data["topological_graph"]
        transformation_references = MagazinoTranslate.build_transformation_references(data["transformations"])
        vertex_poses_map = []
        for vertex in topological_graph['vertices']:
            origin = MagazinoTranslate.Transformation()
            vertex_position = MagazinoTranslate.Transformation(
                x=vertex['pose']['position'][0],
                y=vertex['pose']['position'][1],
                frame_id=vertex["pose"]["frame"],
                child_frame_id=vertex['name'],
            )
            while vertex_position.frame_id != "map":
                vertex_position = vertex_position.translate_to_parent(
                    transformation_references[vertex_position.frame_id]
                )
                print(vertex_position)
            print("result")
            print(vertex_position)
            vertex_poses_map.append(vertex_position)
            newGraph.createNode(nodeX=vertex_position.translation[0], nodeY=vertex_position.translation[1], nodeId=vertex['name'])
        for edge in topological_graph['edges']:
            startNode = newGraph.getNodeById(edge['origin'])
            endNode = newGraph.getNodeById(edge['target'])
            if startNode is None:
                print(f'Could not create edge because {edge["origin"]} does not exist')
                continue
            if endNode is None:
                print(f'Could not create edge because {edge["target"]} does not exist')
                continue
            newGraph.createEdge(startNode=startNode, endNode=endNode)

def importMagazino_old(fileName, filePath, newMap):
    with open(filePath + '/' + fileName + '.json') as file:
        data = json.load(file)
        newGraph = newMap.createNavigationGraph(newGraphId='new_Magazino_graph')
        currentFrameLevel = 0
        maxFrameLevel = 4
        currentTransformationList = []
        frameTransformations = {}
        frameTransformations_W = {}
        referencesToShelfs = {}
        for shelfFrame in data['transformations']['child_frames'][0]['child_frames']:
            if 'rotation' in shelfFrame['transform']:
                frameTransformations[shelfFrame['name']] = MapComponents.CoordinateTransformation(transX=shelfFrame['transform']['translation'][0], transY=shelfFrame['transform']['translation'][1], rotation=shelfFrame['transform']['rotation'][2])
                frameTransformations_W[shelfFrame['name']] = shelfFrame['transform']['rotation'][3]
            else:
                frameTransformations[shelfFrame['name']] = MapComponents.CoordinateTransformation(transX=shelfFrame['transform']['translation'][0], transY=shelfFrame['transform']['translation'][1], rotation=0.0)
                frameTransformations_W[shelfFrame['name']] = 0.0
            referencesToShelfs[shelfFrame['name']] = [shelfFrame['name']]
            if 'child_frames' in shelfFrame:
                for segment in shelfFrame['child_frames']:
                    if 'rotation' in segment['transform']:
                        frameTransformations[segment['name']] = MapComponents.CoordinateTransformation(
                            transX=segment['transform']['translation'][0],
                            transY=segment['transform']['translation'][1],
                            rotation=segment['transform']['rotation'][2])
                        frameTransformations_W[segment['name']] = segment['transform']['rotation'][3]
                    else:
                        frameTransformations[segment['name']] = MapComponents.CoordinateTransformation(
                            transX=segment['transform']['translation'][0],
                            transY=segment['transform']['translation'][1], rotation=0.0)
                        frameTransformations_W[segment['name']] = 0.0
                    referencesToShelfs[segment['name']] = [shelfFrame['name'], segment['name']]
                    if 'child_frames' in segment:
                        for layer in segment['child_frames']:
                            if 'rotation' in layer['transform']:
                                frameTransformations[layer['name']] = MapComponents.CoordinateTransformation(
                                    transX=layer['transform']['translation'][0],
                                    transY=layer['transform']['translation'][1],
                                    rotation=layer['transform']['rotation'][2])
                                frameTransformations_W[layer['name']] = layer['transform']['rotation'][3]
                            else:
                                frameTransformations[layer['name']] = MapComponents.CoordinateTransformation(
                                    transX=layer['transform']['translation'][0],
                                    transY=layer['transform']['translation'][1], rotation=0.0)
                                frameTransformations_W[layer['name']] = 0.0
                            referencesToShelfs[layer['name']] = [shelfFrame['name'], segment['name'], layer['name']]
        print(frameTransformations)
        print(referencesToShelfs)
        topologicalGraph = data['topological_graph']
        for vertex in topologicalGraph['vertices']:
            nodeId = vertex['name']
            nodeX = vertex['pose']['position'][0]
            nodeY = vertex['pose']['position'][1]
            newNode = newGraph.createNode(nodeX=nodeX, nodeY=nodeY, nodeId=nodeId)
            if vertex['pose']['frame'] in referencesToShelfs:
                print('')
                print('Node ID', newNode['id'], newNode['x'], newNode['y'])
                for transformationRef in referencesToShelfs[vertex['pose']['frame']][::-1]:
                    transformation = frameTransformations[transformationRef]
                    print('Transformation', transformationRef, '-', transformation.translationX, transformation.translationY, transformation.rotationZ, frameTransformations_W[transformationRef])
                    transformedX, transformedY = transformation.rosTransformCoordinates(x=newNode['x'], y=newNode['y'])
                    print(transformedX, transformedY)
                    newGraph.updateNodeCoordinates(newNode, transformedX-newNode['x'], transformedY-newNode['y'])
        for edge in topologicalGraph['edges']:
            startNode = newGraph.getNodeById(edge['origin'])
            endNode = newGraph.getNodeById(edge['target'])
            if startNode is None:
                print(f'Could not create edge because {edge["origin"]} does not exist')
                continue
            if endNode is None:
                print(f'Could not create edge because {edge["target"]} does not exist')
                continue
            newGraph.createEdge(startNode=startNode, endNode=endNode)








class TrajectoryInterpolator:

    def __init__(self):
        self.smoothnes = 10
        self.goettingMapScale = 1000.0
        self.goettingNurbsDegree = 3
        self.goettingNurbsWeight = 1.0
        self.mlrMapScale = 1.0
        self.nurbsDelta = 0.01
        self.thresForInterpoaltion = -1

    @staticmethod
    def convertToNurbsMLR(map_json):
        converted_json_list = []
        for edge in map_json["edges"]:
            edge_obj = {"id": edge["edgeId"], "trajectory": list()}
            knotVector = edge["trajectory"]["knotVector"]
            degree = edge["trajectory"]["degree"]
            traj_obj = {"degree": degree, "knotVector": knotVector, "controlPoints": list()}
            for controlPoint in edge["trajectory"]["controlPoints"]:
                traj_obj["controlPoints"].append({
                    'graphX': controlPoint['x'],
                    'graphY': controlPoint['y'],
                    'w': controlPoint['weight']
                })
            edge_obj["trajectory"] = traj_obj  # for more than one trajectories it will be  edge_obj["trajectories"].append(traj_obj)
            converted_json_list.append(edge_obj)
        return converted_json_list

    @staticmethod
    def getKnotVector(nPoints, degree):
        knotLength = nPoints+degree+1
        customeKnotVector = np.zeros(knotLength).tolist()
        len_ls = [4, 6, 8]
        if knotLength in len_ls:
            idx_ls = np.arange((knotLength//2)+1)[1:]
            for idx in idx_ls:
                customeKnotVector[-idx] = 1.0
            return customeKnotVector
        in_between_pts = knotLength - len_ls[-1]
        n = 3
        numsDiv = nPoints/n
        diff = 1/numsDiv
        str_idx = 4
        n_extra = in_between_pts//n
        n_remain = in_between_pts % n
        if in_between_pts >= n:
            idx_ls = np.arange(len_ls[0]+1)[1:]
            for idx in idx_ls:
                customeKnotVector[-idx] = 1.0
            for i in range(n_extra):
                customeKnotVector[str_idx] = customeKnotVector[str_idx-1] + diff
                customeKnotVector[str_idx+1] = customeKnotVector[str_idx-1] + diff
                customeKnotVector[str_idx+2] = customeKnotVector[str_idx-1] + diff
                str_idx += n
            str_idx -= n
            for i in range(n_remain):
                customeKnotVector[str_idx] = customeKnotVector[str_idx-1] + diff
                str_idx += 1
        return customeKnotVector
    
    def convertToNurbsGoetting(self, map_json):
        converted_json_list = []
        for segment in map_json:
            if "controlPoints" in segment:
                edge_obj = {"id": str(segment["id"]), "trajectory": list()}
                pth = list()
                controlPoints = list()
                w = self.goettingNurbsWeight
                traj_obj = {"degree": self.goettingNurbsDegree, "knotVector": list(), "controlPoints": list()}
                for controlPoint in segment["controlPoints"]:
                    x = controlPoint["x"] / self.goettingMapScale
                    y = controlPoint["y"] / self.goettingMapScale
                    pth.append([x, y, w])
                    controlPoints.append({"graphX": x, "graphY": y, "w": w})
                curve = NURBS.Curve()
                if len(segment["controlPoints"]) == 2:
                    curve.degree = 1
                else:
                    curve.degree = self.goettingNurbsDegree
                curve.ctrlptsw = pth
                # Auto-generate knot vector For knot vectors # https://en.wikipedia.org/wiki/B-spline
#                curve.knotvector = utilities.generate_knot_vector(curve.degree, len(curve.ctrlpts))
                curve.knotvector = self.getKnotVector(len(pth), curve.degree)
                # Set evaluation delta
                curve.delta = self.nurbsDelta
                traj_obj["degree"] = curve.degree
                traj_obj["knotVector"] = curve.knotvector
                traj_obj["controlPoints"] = controlPoints
                edge_obj["trajectory"] = traj_obj  # for more than one trajectories it will be  edge_obj["trajectories"].append(traj_obj)
                converted_json_list.append(edge_obj)
        return converted_json_list
    
    def convertToNurbs(self, file, vendor):
        fileName, filePath = getFileName(file)
        map_json = json.load(open(file, "r"))
        converted_json_list = []
        splVendor = str(vendor).split(".")[-1]
        mapId = fileName+"_nurbs_trajectories"
        if "mapId" in map_json:
            mapId = map_json["mapId"]+"_"+mapId
        converted_json_list = {"id": mapId, "edges": list()}
        if splVendor == "MLR":
            converted_json_list["edges"] = self.convertToNurbsMLR(map_json)
        elif splVendor == "Goetting":
            converted_json_list["edges"] = self.convertToNurbsGoetting(map_json)
        converted_json_obj = json.dumps(converted_json_list)
        #print("in convertToNurbs method: filePath  / vendor: ", filePath+"//"+splVendor)
        open(filePath+"//"+fileName+"_converted_as_nurbs.json", "w").write(converted_json_obj)
        return converted_json_list
