# %%
import json
import math
from typing import Dict, List, Optional

import numpy

# %%
_EPS = numpy.finfo(float).eps * 4.0


def quaternion_matrix(quaternion):
    """Return homogeneous rotation matrix from quaternion.

    >>> R = quaternion_matrix([0.06146124, 0, 0, 0.99810947])
    >>> numpy.allclose(R, rotation_matrix(0.123, (1, 0, 0)))
    True

    """
    q = numpy.array(quaternion[:4], dtype=numpy.float64, copy=True)
    nq = numpy.dot(q, q)
    if nq < _EPS:
        return numpy.identity(4)
    q *= math.sqrt(2.0 / nq)
    q = numpy.outer(q, q)
    return numpy.array((
        (1.0-q[1, 1]-q[2, 2],     q[0, 1]-q[2, 3],     q[0, 2]+q[1, 3], 0.0),
        (    q[0, 1]+q[2, 3], 1.0-q[0, 0]-q[2, 2],     q[1, 2]-q[0, 3], 0.0),
        (    q[0, 2]-q[1, 3],     q[1, 2]+q[0, 3], 1.0-q[0, 0]-q[1, 1], 0.0),
        (                0.0,                 0.0,                 0.0, 1.0)
        ), dtype=numpy.float64)


def quaternion_from_matrix(matrix):
    """Return quaternion from rotation matrix.

    >>> R = rotation_matrix(0.123, (1, 2, 3))
    >>> q = quaternion_from_matrix(R)
    >>> numpy.allclose(q, [0.0164262, 0.0328524, 0.0492786, 0.9981095])
    True

    """
    q = numpy.empty((4, ), dtype=numpy.float64)
    M = numpy.array(matrix, dtype=numpy.float64, copy=False)[:4, :4]
    t = numpy.trace(M)
    if t > M[3, 3]:
        q[3] = t
        q[2] = M[1, 0] - M[0, 1]
        q[1] = M[0, 2] - M[2, 0]
        q[0] = M[2, 1] - M[1, 2]
    else:
        i, j, k = 0, 1, 2
        if M[1, 1] > M[0, 0]:
            i, j, k = 1, 2, 0
        if M[2, 2] > M[i, i]:
            i, j, k = 2, 0, 1
        t = M[i, i] - (M[j, j] + M[k, k]) + M[3, 3]
        q[i] = t
        q[j] = M[i, j] + M[j, i]
        q[k] = M[k, i] + M[i, k]
        q[3] = M[k, j] - M[j, k]
    q *= 0.5 / math.sqrt(t * M[3, 3])
    return q


class Transformation:
    """ Represents a transformation.
     - multiplication via * operator
     - inverse
     - convert to ros pose and transformation messages
    """
    def __init__(
        self,
        x: float = 0.0,
        y: float = 0.0,
        z: float = 0.0,
        qx: float = 0.0,
        qy: float = 0.0,
        qz: float = 0.0,
        qw: float = 1.0,
        frame_id: Optional[str] = None,
        child_frame_id: Optional[str] = None,
    ) -> None:
        self.translation: List[float] = [x, y, z]
        self.q: List[float] = [qx, qy, qz, qw]

        self.frame_id = frame_id
        self.child_frame_id = child_frame_id

    def to_matrix(self) -> numpy.ndarray:
        matrix = quaternion_matrix(self.q)
        matrix[:3, 3] = self.translation[:3]
        return matrix

    @classmethod
    def from_matrix(cls, matrix: numpy.ndarray) -> "Transformation":
        self = cls()
        self.translation = matrix[:3, 3]
        self.q = quaternion_from_matrix(matrix).tolist()
        return self

    @classmethod
    def from_dict(cls, dct: Dict) -> "Transformation":
        self = cls()
        self.translation = dct["translation"]
        self.q = dct["rotation"]
        return self

    def __repr__(self) -> str:
        output = ", ".join([f"{round(x, 3)}" for x in self.translation]) + " / "
        output += ", ".join([f"{round(x, 3)}" for x in self.q])
        if self.frame_id and self.child_frame_id:
            return output + f" {self.frame_id} -> {self.child_frame_id}"
        if self.frame_id:
            return output + f" in {self.frame_id}"
        return output

    def translate_to_parent(self, parent: "Transformation") -> "Transformation":
        mtx = self.to_matrix()
        other_mtx = parent.to_matrix()
        res_mtx = other_mtx @ mtx
        transform = Transformation.from_matrix(res_mtx)
        transform.frame_id = parent.frame_id
        transform.child_frame_id = self.child_frame_id
        return transform


# %%

def build_transformation_references(reference_tree):
    references = {}  # translation to parent

    children = reference_tree.get("child_frames", [])
    for child in children:
        trans = Transformation(frame_id=reference_tree["name"], child_frame_id=child["name"])
        transform_dct = child.get("transform", {})
        if transform_dct:
            trans.translation = transform_dct["translation"]
            trans.q = transform_dct.get("rotation", [0.0, 0.0, 0.0, 1.0])
        references[child["name"]] = trans

    for child in children:
        for child in reference_tree["child_frames"]:
            references.update(build_transformation_references(child))
    return references
