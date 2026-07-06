# -*- coding: utf-8 -*-
"""
Created on Tue Aug 27 16:57:27 2019

@author: DanielKampen
"""

import math
import numpy as np
import matplotlib.pyplot as plt
import uuid

class Node(object):
    def __init__(self, Id=None, x=None, y=None):
        self.__Id = Id
        self.__x = x
        self.__y = y
        
    def getId(self):
        return str(self.__Id)
    
    def setId(self, Id):
        self.__Id = Id
        return self
        
    def getx(self):
        return self.__x
    
    def setx(self, x):
        self.__x = x
        return self
    
    def gety(self):
        return self.__y
    
    def sety(self, y):
        self.__y = y
        return self
        
    def createId(self, occupiedIds):
        if self.__Id == None:
            self.__Id = str(uuid.uuid4())
            while self.__Id in occupiedIds:
                self.__Id = str(uuid.uuid4())
        return self
        
    def inBetween(self,node1,node2,option):
        if option == 'horizontal':
            if self.__y < node1.gety() and self.__y > node2.gety() or self.__y > node1.gety() and self.__y < node2.gety():
                return True
            else:
                return False
        elif option == 'vertical':
            if self.__x < node1.getx() and self.__x > node2.getx() or self.__x > node1.getx() and self.__x < node2.getx():
                return True
            else:
                return False
            
            
class Edge(object):
    def __init__(self, Id=None, start_node=None, end_node=None):
        self.__Id = Id
        self.__start_node = start_node
        self.__end_node = end_node
        
    def __str__(self):
        text = 'Id: ' + str(self.__Id) + ', start node: ' + str(self.__start_node) + ', end node: ' + str(self.__end_node)
        return text
        
    def getId(self):
        return str(self.__Id)
    
    def setId(self, Id):
        self.__Id = Id
        return self
        
    def getstart_node(self):
        return self.__start_node
    
    def setstart_node(self, start_node):
        self.__start_node = start_node
        return self
    
    def getend_node(self):
        return self.__end_node
    
    def setend_node(self, end_node):
        self.__end_node = end_node
        return self
        
    def createId(self, occupiedIds):
        if self.__Id == None:
            self.__Id = str(uuid.uuid4())
            while self.__Id in occupiedIds:
                self.__Id = str(uuid.uuid4())
        return self
        
    def calculateLength(self,nodes):
        dist = math.sqrt((nodes[self.__end_node].getx() - nodes[self.__start_node].getx())**2 + (nodes[self.__end_node].gety() - nodes[self.__start_node].gety())**2)
        return dist
        
class Destination(object):
    def __init__(self, x = None, y = None, nodeId = None, direction = None, assignedEdge = None, locationType = None, locationId = None):
        self.__x = x
        self.__y = y
        self.__nodeId = nodeId
        self.__direction = direction #horizontal, vertical, perpendicular
        self.__assignedEdge = assignedEdge
        self.__locationType = locationType
        self.__locationId = locationId
    
    def getx(self):
        return self.__x
    
    def setx(self, x):
        self.__x = x
        return self
    
    def gety(self):
        return self.__y
    
    def sety(self, y):
        self.__y = y
        return self
    
    def getnodeId(self):
        return self.__nodeId
    
    def setnodeId(self, nodeId):
        self.__nodeId = nodeId
        return self
    
    def getdirection(self):
        return self.__direction
    
    def setdirection(self, direction):
        self.__direction = direction
        return self
    
    def getassignedEdge(self):
        return self.__assignedEdge
    
    def setassignedEdge(self, assignedEdge):
        self.__assignedEdge = assignedEdge
        return self
    
    def getlocationType(self):
        return self.__locationType
    
    def getlocationId(self):
        return self.__locationId
        
#    def createNode(self, occupiedNodeIds):
#        if self.__nodeId == None and self.__x != None and self.__y != None:
#           node = Nodes(None, self.__x, self.__y) 
#           node = node.createId(occupiedNodeIds)
#        return self
        
    def createId(self, occupiedIds):
        if self.__Id == None:
            self.__Id = str(uuid.uuid4())
            while self.__Id in occupiedIds:
                self.__Id = str(uuid.uuid4())
        return self
        
    def assignToNode(self,node):
        self.__x = node.getx()
        self.__y = node.gety()
        self.__nodeId = node.getId()
        return self
        
class ExternalLocation(object):
    def __init__(self, Id, node=None, locationType=None):
        self.__Id = Id
        self.__node = node
        self.__locationType = locationType
        
    def getId(self):
        return self.__Id
    
    def setId(self, Id):
        self.__Id = Id
        return self
    
    def createId(self, occupiedIds = []):
        if self.__Id == None:
            self.__Id = str(uuid.uuid4())
            while self.__Id in occupiedIds:
                self.__Id = str(uuid.uuid4())
        return self
    
    def getnode(self):
        return self.__node
    
    def setnode(self,node):
        self.__node = node
        return self
    
    def getlocationType(self):
        return self.__locationType
    
    def setlocationType(self,locationType):
        self.__locationType = locationType
        return self
        
class Layout(object):
    def __init__(self, Id, nodes, edges, edge_limit, externalLocations = {} ):
        self.__Id = Id
        self.__nodes = nodes
        self.__edges = edges
        self.__edge_limit = edge_limit
        self.__externalLocations = externalLocations
        
    def getNodeIds(self):
        nodeIds = []
        for node in self.__nodes.keys():
            nodeIds.append(self.__nodes[node].getId())
        return nodeIds
    
    def getNodes(self):
        return self.__nodes
    
    def getEdgeIds(self):
        edgeIds = []
        for edge in self.__edges.keys():
            edgeIds.append(self.__edges[edge].getId())
        return edgeIds
    
    def getEdges(self):
        return self.__edges
    
    def getNodesInEdge(self,edge):
        nodeIds = []
        for edge in self.__edges.keys():
            nodeIds.append(self.__edges[edge].getstart_node())
            nodeIds.append(self.__edges[edge].getend_node())
        return nodeIds
    
    def getNodesInEdges(self):
        nodeIds = []
        for edge in self.__edges.keys():
            nodeIds.append(self.getNodesInEdge(self.__edges[edge]))
        return nodeIds
    
    def addExternalLocation(self, externalLocation):
        self.__externalLocations[externalLocation.getId] = externalLocation
        return self
        
    def splitedge(self, edge):
        
        if edge.calculateLength(self.__nodes) > self.__edge_limit:
            number_new_nodes = math.ceil(edge.calculateLength(self.__nodes)/self.__edge_limit) -1
            dx = (self.__nodes[edge.getend_node()].getx() - self.__nodes[edge.getstart_node()].getx()) / (number_new_nodes+1)
            dy = (self.__nodes[edge.getend_node()].gety() - self.__nodes[edge.getstart_node()].gety()) / (number_new_nodes+1)
            
            newnodes = []
            newedges = []
            

            for node_counter in range(0,number_new_nodes):
                newnode = Node()
                newnode = newnode.createId(self.getNodeIds())
                newnode = newnode.setx(self.__nodes[edge.getstart_node()].getx()+ (node_counter+1)*dx)
                newnode = newnode.sety(self.__nodes[edge.getstart_node()].gety() + (node_counter+1)*dy)
                
                newnodes.append(newnode)
                
            for edge_counter in range(0,number_new_nodes+1):
                
                if edge_counter == 0: #change old edge
                    old_end_node_edge = edge.getend_node() #gibt es hierfür eine schönere Lösung?
                    self.__edges[edge.getId()].setend_node(newnodes[edge_counter].getId())
                    
                elif edge_counter == number_new_nodes:
                    newedge = Edge()
                    newedge = newedge.createId(self.getEdgeIds())
                    newedge = newedge.setstart_node(newnodes[edge_counter-1].getId())
                    newedge = newedge.setend_node(old_end_node_edge) #gibt es hierfür eine schönere Lösung?
                    newedges.append(newedge)
                else:
                    newedge = Edge()
                    newedge = newedge.createId(self.getEdgeIds())
                    newedge = newedge.setstart_node(newnodes[edge_counter-1].getId())
                    newedge = newedge.setend_node(newnodes[edge_counter].getId())
                    newedges.append(newedge)                 
                
            for nnodes in newnodes:
                self.__nodes[nnodes.getId()] = nnodes
            for nedge in newedges:
                self.__edges[nedge.getId()] = nedge
        
        return self
    
    def splitedges(self):
        keys = list(self.__edges.keys())
        for edge in keys:
            self = self.splitedge(self.__edges[edge])            
        return self
    
    def addNode(self,x,y):
        node = Node()
        node = node.setx(x)
        node = node.sety(y)
        node = node.createId(self.getNodeIds())        
        self.__nodes[node.getId()] = node
        return self, node.getId()
    
    def connectNodeToLayout(self,node,edge,direction):
        if node.getId() not in self.getNodesInEdges():
            if direction == 'horizontal':
                if node.inBetween(self.__nodes[edge.getstart_node()],self.__nodes[edge.getend_node()],'horizontal'):
                    newNode = Node()
                    newNode = newNode.createId(self.getNodeIds())
                    newNode = newNode.sety(node.gety())
                    dx = (self.__nodes[edge.getend_node()].getx() - self.__nodes[edge.getstart_node()].getx()) / edge.calculateLength(self.__nodes)
                    newNode = newNode.setx(self.__nodes[edge.getstart_node()].getx() + dx * abs(newNode.gety()-self.__nodes[edge.getstart_node()].gety()))
                    
                    #test if node on edge
                    if newNode.getx() == node.getx() and newNode.gety() == node.gety():
                        newNode = None
                    else:
                        self.__nodes[newNode.getId()] = newNode
                    #update and add edges
                    if newNode == None:
                        old_end_node_edge = self.__edges[edge.getId()].getend_node()
                        self.__edges[edge.getId()].setend_node(node.getId())
                        newedge = Edge()
                        newedge = newedge.createId(self.getEdgeIds())
                        newedge = newedge.setstart_node(node.getId())
                        newedge = newedge.setend_node(old_end_node_edge) #gibt es hierfür eine schönere Lösung?
                        self.__edges[newedge.getId()] = newedge
                    else:
                        old_end_node_edge = self.__edges[edge.getId()].getend_node()
                        self.__edges[edge.getId()].setend_node(newNode.getId())
                        
                        newedge1 = Edge()
                        newedge1 = newedge1.createId(self.getEdgeIds())
                        newedge1 = newedge1.setstart_node(newNode.getId())
                        newedge1 = newedge1.setend_node(old_end_node_edge) #gibt es hierfür eine schönere Lösung?
                        self.__edges[newedge1.getId()] = newedge1
                        
                        newedge2 = Edge()
                        newedge2 = newedge2.createId(self.getEdgeIds())
                        newedge2 = newedge2.setstart_node(newNode.getId())
                        newedge2 = newedge2.setend_node(node.getId())
                        self.__edges[newedge2.getId()] = newedge2
                        
                        newedge3 = Edge()
                        newedge3 = newedge3.createId(self.getEdgeIds())
                        newedge3 = newedge3.setstart_node(node.getId())
                        newedge3 = newedge3.setend_node(newNode.getId())
                        self.__edges[newedge3.getId()] = newedge3               
                    
                else:
                    print('Node kann nicht an Kante angefügt werden')   
                    
            elif direction == 'vertical':
                if node.inBetween(self.__nodes[edge.getstart_node()],self.__nodes[edge.getend_node()],'vertical'):
                    newNode = Node()
                    newNode = newNode.createId(self.getNodeIds())
                    newNode = newNode.setx(node.getx())
                    dy = (self.__nodes[edge.getend_node()].gety() - self.__nodes[edge.getstart_node()].gety()) / edge.calculateLength(self.__nodes)
                    newNode = newNode.sety(self.__nodes[edge.getstart_node()].gety() + dy * abs(newNode.getx()-self.__nodes[edge.getstart_node()].getx()))
                    
                    #test if node on edge
                    if newNode == node:
                        newNode = None
                    else:
                        self.__nodes[newNode.getId()] = newNode
                    #update and add edges
                    if newNode == None:
                        old_end_node_edge = self.__edges[edge.getId()].getend_node()
                        self.__edges[edge.getId()].setend_node(node.getId())
                        newedge = Edge()
                        newedge = newedge.createId(self.getEdgeIds())
                        newedge = newedge.setstart_node(node.getId())
                        newedge = newedge.setend_node(old_end_node_edge) #gibt es hierfür eine schönere Lösung?
                        self.__edges[newedge.getId()] = newedge
                    else:
                        old_end_node_edge = self.__edges[edge.getId()].getend_node()
                        self.__edges[edge.getId()].setend_node(newNode.getId())
                        
                        newedge1 = Edge()
                        newedge1 = newedge1.createId(self.getEdgeIds())
                        newedge1 = newedge1.setstart_node(newNode.getId())
                        newedge1 = newedge1.setend_node(old_end_node_edge) #gibt es hierfür eine schönere Lösung?
                        self.__edges[newedge1.getId()] = newedge1
                        
                        newedge2 = Edge()
                        newedge2 = newedge2.createId(self.getEdgeIds())
                        newedge2 = newedge2.setstart_node(newNode.getId())
                        newedge2 = newedge2.setend_node(node.getId())
                        self.__edges[newedge2.getId()] = newedge2
                        
                        newedge3 = Edge()
                        newedge3 = newedge3.createId(self.getEdgeIds())
                        newedge3 = newedge3.setstart_node(node.getId())
                        newedge3 = newedge3.setend_node(newNode.getId())
                        self.__edges[newedge3.getId()] = newedge3
                          
                else:
                    print('Node kann nicht an Kante angefügt werden')                    
            elif direction == 'perpendicular':
                print('not yet integrated')
        return self
    
    def addDestination(self, destination, node = None):
        if node == None:
            self, nodeId = self.addNode(destination.getx(),destination.gety())
        destination = destination.assignToNode(self.__nodes[nodeId])
        self = self.connectDestinationToLayout(destination)
        
        if destination.getlocationType != None:
            if destination.getlocationId == None:
                destination.createId()
            externalLocation = ExternalLocation(destination.getlocationId, nodeId, destination.getlocationType)
            self = self.addExternalLocation(externalLocation)    
            
        return self 

    def connectDestinationToLayout(self,destination):
        self = self.connectNodeToLayout(self.__nodes[destination.getnodeId()], self.__edges[destination.getassignedEdge()], destination.getdirection())
        return self       
    
    def drawlayout(self):
        plt.figure()
        for nodeId in self.__nodes.keys():
            plt.plot(self.__nodes[nodeId].getx(),self.__nodes[nodeId].gety(),'ro',markersize=5,zorder=2);
            
        for edgeId in self.__edges.keys():
            base_x = self.__nodes[self.__edges[edgeId].getstart_node()].getx()
            base_y = self.__nodes[self.__edges[edgeId].getstart_node()].gety()
            length_x = self.__nodes[self.__edges[edgeId].getend_node()].getx() - self.__nodes[self.__edges[edgeId].getstart_node()].getx()
            length_y = self.__nodes[self.__edges[edgeId].getend_node()].gety() - self.__nodes[self.__edges[edgeId].getstart_node()].gety()
            plt.arrow(base_x, base_y, length_x, length_y, fc="k", ec="k", head_width=0.1, head_length=0.1,length_includes_head=True,zorder=1)
        
        plt.axis('equal')
        plt.show()
        
        return True