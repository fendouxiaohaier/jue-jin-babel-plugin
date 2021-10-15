class NodePath {
  constructor(node, parent, parentPath) {
    this.node = node;
    this.parent = parent;
    this.parentPath = parentPath;
  }
}

module.exports = NodePath;