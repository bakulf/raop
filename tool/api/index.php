<?php

require_once('LibRDF/LibRDF.php');

define("ROAP", "https://github.com/tizzja/raop/");

header('Content-type: application/json');

// JSON to RDF
if (isset($_POST['toRDF'])) {
  toRDF($_POST['toRDF']);
  return;
}

// RDF to JSON:
$postdata = file_get_contents("php://input");

if (empty($postdata)) {
  echo '{ "status": "failed", "error": "no input" }';
  return;
}

$store = new LibRDF_Storage();
$model = new LibRDF_Model($store);

try {
  $model->loadStatementsFromString(new LibRDF_Parser('rdfxml'),
                                   $postdata);
} catch(LibRDF_Error $e) {
  echo '{ "status": "failed", "error": "parser error" }';
  return;
}

/* TODO
$foafKnows = new LibRDF_URINode("http://xmlns.com/foaf/0.1/knows");
$foafName = new LibRDF_URINode("http://xmlns.com/foaf/0.1/name");
$results = $model->findStatements(null, $foafKnows, null);
foreach ($results as $result) {
    $person1 = $result->getSubject();
    $person2 = $result->getObject();
    $name1 = $model->getTarget($person1, $foafName);
    $name2 = $model->getTarget($person2, $foafName);
    echo "$name1 knows $name2\n";
}
*/

echo '{ "status": "success", "data": {} }'; // TODO

function toRDF($obj) {
  $data = json_decode($obj, true);
  if (!$data) {
    echo '{ "status": "failed", "error": "json error" }';
    return;
  }

  $objects = Array();

  $store = new LibRDF_Storage();
  $model = new LibRDF_Model($store);

  $document = new LibRDF_URINode($_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']);
  $predicate = new LibRDF_URINode(RDF_BASE_URI . "type");
  $object = new LibRDF_URINode(ROAP . "Document");
  $statement = new LibRDF_Statement($document, $predicate, $object);
  $model->addStatement($statement);

  if (is_array($data['data'])) {
    $predicate = new LibRDF_URINode(ROAP ."lines");
    $lineSeq = new LibRDF_BlankNode();
    $statement = new LibRDF_Statement($document, $predicate, $lineSeq);
    $model->addStatement($statement);

    $predicate = new LibRDF_URINode(RDF_BASE_URI . "type");
    $object = new LibRDF_URINode(RDF_BASE_URI . "Seq");
    $statement = new LibRDF_Statement($lineSeq, $predicate, $object);
    $model->addStatement($statement);

    foreach ($data['data'] as $line) {
      $predicate = new LibRDF_URINode(RDF_BASE_URI ."li");
      $lineObj = new LibRDF_BlankNode();
      $objects['line_' . $line['lineId']] = $lineObj;
      $statement = new LibRDF_Statement($lineSeq, $predicate, $lineObj);
      $model->addStatement($statement);

      $predicate = new LibRDF_URINode(RDF_BASE_URI ."type");
      $object = new LibRDF_URINode(ROAP . "Line");
      $statement = new LibRDF_Statement($lineObj, $predicate, $object);
      $model->addStatement($statement);

      $predicate = new LibRDF_URINode(ROAP ."words");
      $wordSeq = new LibRDF_BlankNode();
      $statement = new LibRDF_Statement($lineObj, $predicate, $wordSeq);
      $model->addStatement($statement);

      $predicate = new LibRDF_URINode(RDF_BASE_URI . "type");
      $object = new LibRDF_URINode(RDF_BASE_URI . "Seq");
      $statement = new LibRDF_Statement($wordSeq, $predicate, $object);
      $model->addStatement($statement);

      if (!is_array($line['data'])) {
        continue;
      }

      foreach ($line['data'] as $word) {
        $predicate = new LibRDF_URINode(RDF_BASE_URI ."li");
        $wordObj = new LibRDF_BlankNode();
        $objects['text_' . $line['textId']] = $lineObj;
        $statement = new LibRDF_Statement($wordSeq, $predicate, $wordObj);
        $model->addStatement($statement);

        $predicate = new LibRDF_URINode(RDF_BASE_URI ."type");
        $object = new LibRDF_URINode(ROAP . "World");
        $statement = new LibRDF_Statement($wordObj, $predicate, $object);
        $model->addStatement($statement);

        $predicate = new LibRDF_URINode(ROAP . "value");
        $object = new LibRDF_LiteralNode($word['data']);
        $statement = new LibRDF_Statement($wordObj, $predicate, $object);
        $model->addStatement($statement);
      }
    }
  }

  if (is_array($data['retos'])) {
    foreach ($data['retos'] as $reto) {
      $predicate = new LibRDF_URINode(ROAP ."rethoricalAnnotation");
      $retoObj = new LibRDF_BlankNode();
      $statement = new LibRDF_Statement($document, $predicate, $retoObj);
      $model->addStatement($statement);

      $predicate = new LibRDF_URINode(RDF_BASE_URI ."type");
      $object = new LibRDF_URINode(ROAP . $reto['type']);
      $statement = new LibRDF_Statement($retoObj, $predicate, $object);
      $model->addStatement($statement);

      // TODO: items
    }
  }

  $serializer = new LibRDF_Serializer('rdfxml-abbrev');
  $str = $model->serializeStatements($serializer);
  $str = str_replace("\n", '\\n', addslashes($str));
  echo '{ "status" : "success", "data": "' . $str . '"}';
}
