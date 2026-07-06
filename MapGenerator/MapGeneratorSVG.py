# -*- coding: utf-8 -*-
"""
Created on Thu Oct 24 09:55:32 2019

@author: DanielKampen
"""

import svgwrite as svg


def SVGLoad(path,name):
    
    with open(path+name+'.svg','r') as file:
        
        return False


def SVGWriter(polygons, path, name):
    
    with open(path+name+'.svg', "w+") as file:
        environment = svg.Drawing(name+'.svg', profile='tiny')
        shapes = environment.add(environment.g(id='shapes', fill='gray', stroke='black'))
        
        for polygon in polygons:
            print(polygon['polygon'].getVertices())
            shapes.add(environment.polygon(polygon['polygon'].getVertices()))
              
  
    
        environment.save()