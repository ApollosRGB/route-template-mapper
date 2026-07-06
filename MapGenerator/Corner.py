# -*- coding: utf-8 -*-
"""
Created on Wed Aug 21 14:33:37 2019

@author: DanielKampen
"""
from math import acos
from math import sqrt
from math import pi


class Corner():
    
    def __init__(self, edge1_v1, edge1_v2, edge2_v1, edge2_v2):
        if all(edge1_v1 == edge2_v1):
            self.__vector1 = [edge1_v2[0] - edge1_v1[0], edge1_v2[1] - edge1_v1[1]]
            self.__vector2 = [edge2_v2[0] - edge1_v1[0], edge2_v2[1] - edge1_v1[1]]
        elif all(edge1_v1 == edge2_v2):
            self.__vector1 = [edge1_v2[0] - edge1_v1[0], edge1_v2[1] - edge1_v1[1]]
            self.__vector2 = [edge2_v1[0] - edge1_v1[0], edge2_v1[1] - edge1_v1[1]]
        elif all(edge1_v2 == edge2_v1):
            self.__vector1 = [edge1_v1[0] - edge1_v2[0], edge1_v1[1] - edge1_v2[1]]
            self.__vector2 = [edge2_v2[0] - edge1_v2[0], edge2_v2[1] - edge1_v2[1]]
        elif all(edge1_v2 == edge2_v2):
            self.__vector1 = [edge1_v1[0] - edge1_v2[0], edge1_v1[1] - edge1_v2[1]]
            self.__vector2 = [edge2_v1[0] - edge1_v2[0], edge2_v1[1] - edge1_v2[1]]
            
    def length(self, vector):
        return sqrt(vector[0]**2+vector[1]**2)
    
    def dot_product(self):
        return self.__vector1[0]*self.__vector2[0]+self.__vector1[1]*self.__vector2[1]
   
    def determinant(self):
        return self.__vecto1[0]*self.__vector2[1]-self.__vector1[1]*self.__vector2[0]
   
    def inner_angle(self):
        cosX = self.dot_product()/(self.length(self.__vector1)*self.length(self.__vector2))
        if cosX < -1.0:
            cosX = -1.0
        elif cosX > 1.0:
            cosX = 1.0

        rad = acos(cosX) # in radians
        return rad*180/pi # returns degrees
   
    def angle_clockwise(self):
        inner = self.inner_angle()
        det = self.determinant()
        if det < 0: #this is a property of the det. If the det < 0 then B is clockwise of A
            return inner
        else: # if the det > 0 then A is immediately clockwise of B
            return 360-inner
        
    def isCorner(self):
        if self.inner_angle() < 150:
            return True
        else:
            return False