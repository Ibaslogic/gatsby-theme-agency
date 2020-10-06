const path = require("path")
// lodash javascript util library
const _ = require("lodash")

// creating slug
exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions
  if (node.internal.type === "MarkdownRemark") {
    const slug = path.basename(node.fileAbsolutePath, ".md")

    // To filter by source instance - i.e md files in the 'src/...' directory

    // let's get all the source instance from the parent node
    const collection = getNode(node.parent).sourceInstanceName

    // Then create field called "collection" having all the parent source instance.
    createNodeField({
      node,
      name: "collection",
      value: collection,
    })

    // creating slug field
    createNodeField({
      node,
      name: "slug",
      value: slug,
    })
  }
}

// Now, let's create pages

exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions
  const blogTemplate = require.resolve("./src/templates/blog.js")
  const servicesTemplate = require.resolve("./src/templates/services-posts.js")
  const tagTemplate = require.resolve("./src/templates/tags.js")

  const response = await graphql(`
    query {
      siteData: site {
        siteMetadata {
          blogBasePath
        }
      }
      allPostsContent: allMarkdownRemark(
        sort: { fields: frontmatter___dateUpdated, order: DESC }
      ) {
        edges {
          node {
            frontmatter {
              tags
            }
            fields {
              collection
              slug
            }
            parent {
              ... on File {
                relativePath
              }
            }
          }
        }
      }
    }
  `)

  const allPosts = response.data.allPostsContent.edges
  const blogBasePath = response.data.siteData.siteMetadata.blogBasePath

  const blogPosts = allPosts.filter(
    edge => edge.node.fields.collection === `blog`
  )

  const ServicesPosts = allPosts.filter(
    edge => edge.node.fields.collection === `services`
  )

  blogPosts.forEach(({ node }, index) => {
    const prev =
      index === blogPosts.length - 1 ? null : blogPosts[index + 1].node
    const next = index === 0 ? null : blogPosts[index - 1].node
    createPage({
      path: `${blogBasePath}/${node.fields.slug}`,
      component: blogTemplate,
      context: {
        slug: node.fields.slug,
        postPath: node.parent.relativePath,
        prev,
        next,
      },
    })
  })

  ServicesPosts.forEach(({ node }) => {
    createPage({
      path: `/services/${node.fields.slug}`,
      component: servicesTemplate,
      context: {
        slug: node.fields.slug,
      },
    })
  })

  //tags page

  let tags = []
  _.each(blogPosts, edge => {
    if (_.get(edge, "node.frontmatter.tags")) {
      tags = tags.concat(edge.node.frontmatter.tags)
    }
  })

  // Eliminate duplicate tags
  tags = _.uniq(tags)

  // Make tag pages
  tags.forEach(tag => {
    createPage({
      path: `/tags/${_.kebabCase(tag)}/`,
      component: tagTemplate,
      context: {
        tag,
      },
    })
  })
}
