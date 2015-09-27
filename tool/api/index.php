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

toJSON($model);

function toJSON($model) {
  $data = Array( 'data' => Array());

  $predicate = new LibRDF_URINode(RDF_BASE_URI . "type");
  $object = new LibRDF_URINode(ROAP . "Document");
  $results = $model->findStatements(null, $predicate, $object);

  if ($results->valid()) {
    $document = $results->current()->getSubject();

    $predicate = new LibRDF_URINode(ROAP. "lines");
    $results = $model->findStatements($document, $predicate, null);
    if ($results->valid()) {
      $lines = $results->current()->getObject();

      $predicate = new LibRDF_URINode(RDF_BASE_URI . "type");
      $object = new LibRDF_URINode(RDF_BASE_URI . "Seq");
      $results = $model->findStatements($lines, $predicate, $object);

      if (!$results->valid()) {
        continue;
      }

      $counter = 1;
      while (true) {
        $predicate = new LibRDF_URINode(RDF_BASE_URI . "_" . $counter);
        $results = $model->findStatements($lines, $predicate, null);
        if (!$results->valid()) {
          break;
        }

        $line = lineToJSON($model, $results->current()->getObject(), ++$counter);
        if ($line) {
          $data['data'][] = $line;
        }

        $results->next();
      }
    }
  }

  // TODO retos

  $obj = Array( 'status' => 'success', 'data' => $data );
  echo json_encode($obj);
}

function lineToJSON($model, $obj, $id) {
  $predicate = new LibRDF_URINode(RDF_BASE_URI . "type");
  $object = new LibRDF_URINode(ROAP. "Line");
  $results = $model->findStatements($obj, $predicate, $object);

  if (!$results->valid()) {
    return null;
  }

  $line = Array('lineId' => $id, 'data' => Array());

  $predicate = new LibRDF_URINode(ROAP. "words");
  $results = $model->findStatements($obj, $predicate, null);

  if ($results->valid()) {
    $words = $results->current()->getObject();

    $predicate = new LibRDF_URINode(RDF_BASE_URI . "type");
    $object = new LibRDF_URINode(RDF_BASE_URI . "Seq");
    $results = $model->findStatements($words, $predicate, $object);

    if (!$results->valid()) {
      return null;
    }

    $counter = 1;
    while (true) {
      $predicate = new LibRDF_URINode(RDF_BASE_URI . "_" . $counter);
      $results = $model->findStatements($words, $predicate, null);
      if (!$results->valid()) {
        break;
      }

      $word = wordToJSON($model, $results->current()->getObject(), ++$counter);
      if ($word) {
        $line['data'][] = $word;
      }

      $results->next();
    }
  }

  return $line;
}

function wordToJSON($model, $obj, $id) {
  $predicate = new LibRDF_URINode(RDF_BASE_URI . "type");
  $object = new LibRDF_URINode(ROAP. "Word");
  $results = $model->findStatements($obj, $predicate, $object);

  if (!$results->valid()) {
    return null;
  }

  $predicate = new LibRDF_URINode(ROAP . 'value');
  $results = $model->findStatements($obj, $predicate, null);

  if (!$results->valid()) {
    return null;
  }

  $obj = $results->current()->getObject();
  if ($obj instanceof LibRDF_LiteralNode) {
    return Array('textId' => $id, 'data' => $obj->getValue());
  }

  return null;
}

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
        $object = new LibRDF_URINode(ROAP . "Word");
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
